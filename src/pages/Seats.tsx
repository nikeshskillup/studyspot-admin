import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Armchair } from "lucide-react";
import { toast } from "sonner";

interface Seat {
  id: string;
  seat_number: string;
  status: string;
  student_id: string | null;
}

interface Student {
  id: string;
  student_name: string;
}

const Seats = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeats();
    fetchStudents();
  }, []);

  const fetchSeats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seats")
      .select("*")
      .order("seat_number", { ascending: true });

    if (!error && data) {
      setSeats(data);
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, student_name")
      .eq("subscription_status", "active");

    if (!error && data) {
      setStudents(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      available: "default",
      occupied: "secondary",
      maintenance: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getStudentName = (studentId: string | null) => {
    if (!studentId) return "-";
    const student = students.find((s) => s.id === studentId);
    return student?.student_name || "Unknown";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Seat Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage seat allocations and availability
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Seats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seats.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {seats.filter((s) => s.status === "available").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {seats.filter((s) => s.status === "occupied").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Seats</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading seats...
              </div>
            ) : seats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No seats configured yet
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {seats.map((seat) => (
                  <Card
                    key={seat.id}
                    className={`cursor-pointer transition-colors ${
                      seat.status === "available"
                        ? "hover:bg-accent"
                        : "opacity-75"
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <Armchair
                        className={`h-8 w-8 ${
                          seat.status === "available"
                            ? "text-green-600"
                            : seat.status === "occupied"
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      />
                      <div className="text-lg font-bold">{seat.seat_number}</div>
                      {getStatusBadge(seat.status)}
                      {seat.student_id && (
                        <div className="text-xs text-muted-foreground text-center">
                          {getStudentName(seat.student_id)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Seats;
