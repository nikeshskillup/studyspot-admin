import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  student_name: string;
  phone: string;
  email: string | null;
  seat_number: string | null;
  subscription_status: string;
  qr_url: string | null;
}

const QRCodes = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("student_name", { ascending: true });

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phone.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      inactive: "secondary",
      expired: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">QR Codes</h1>
            <p className="text-muted-foreground mt-2">
              View and manage student QR codes
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student QR Codes</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading QR codes...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No students found matching your search"
                  : "No students registered yet"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                  <Card key={student.id}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {student.student_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {student.phone}
                          </p>
                          {student.email && (
                            <p className="text-sm text-muted-foreground">
                              {student.email}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(student.subscription_status)}
                      </div>
                      
                      <div className="flex items-center justify-center bg-muted rounded-lg p-6">
                        {student.qr_url ? (
                          <img
                            src={student.qr_url}
                            alt={`QR Code for ${student.student_name}`}
                            className="w-32 h-32"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <QrCode className="h-16 w-16" />
                            <p className="text-sm">QR code pending</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Seat: {student.seat_number || "Not assigned"}</p>
                      </div>
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

export default QRCodes;
