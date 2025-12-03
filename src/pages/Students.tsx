import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AddStudentDialog from "@/components/AddStudentDialog";
import EditStudentDialog from "@/components/EditStudentDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  student_name: string;
  phone: string;
  email: string | null;
  seat_number: string | null;
  subscription_status: string;
  registration_date: string;
  monthly_fee: number;
  discount_amount: number;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchStudents();

    // Subscribe to realtime updates for students
    const channel = supabase
      .channel('students-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        () => {
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("registration_date", { ascending: false });

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phone.includes(searchQuery) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-3xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground mt-2">
              Manage student registrations and information
            </p>
          </div>
          <AddStudentDialog onStudentAdded={fetchStudents} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student List</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No students found matching your search"
                  : "No students registered yet"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Seat</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.student_name}
                        </TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>{student.email || "-"}</TableCell>
                        <TableCell>{student.seat_number || "Not assigned"}</TableCell>
                        <TableCell>₹{student.monthly_fee}</TableCell>
                        <TableCell>
                          {getStatusBadge(student.subscription_status)}
                        </TableCell>
                        <TableCell>
                          {new Date(student.registration_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditStudent(student);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <EditStudentDialog
          student={editStudent}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onStudentUpdated={fetchStudents}
        />
      </div>
    </DashboardLayout>
  );
};

export default Students;