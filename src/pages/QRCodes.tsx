import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, QrCode, Calendar, CreditCard, MapPin, Phone, Mail } from "lucide-react";

interface Student {
  id: string;
  student_name: string;
  phone: string;
  email: string | null;
  qr_url: string | null;
  seat_number: string | null;
  subscription_status: string;
  registration_date: string;
  monthly_fee: number;
  discount_amount: number;
}

interface Payment {
  payment_date: string;
  amount: number;
}

const QRCodes = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

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

  const fetchPayments = async (studentId: string) => {
    const { data, error } = await supabase
      .from("payments")
      .select("payment_date, amount")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
  };

  const handleStudentClick = async (student: Student) => {
    setSelectedStudent(student);
    await fetchPayments(student.id);
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

  const calculateDuration = (registrationDate: string) => {
    const start = new Date(registrationDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) % 30;
    
    if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${days} day${days !== 1 ? 's' : ''}`;
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
                  <Card 
                    key={student.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleStudentClick(student)}
                  >
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                      {student.qr_url ? (
                        <img
                          src={student.qr_url}
                          alt={`QR Code for ${student.student_name}`}
                          className="w-48 h-48 object-contain"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-lg">
                          <QrCode className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">{student.student_name}</h3>
                        <p className="text-sm text-muted-foreground">{student.phone}</p>
                        {student.email && (
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        )}
                        {getStatusBadge(student.subscription_status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                {selectedStudent.qr_url ? (
                  <img
                    src={selectedStudent.qr_url}
                    alt={`QR Code for ${selectedStudent.student_name}`}
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 bg-muted flex items-center justify-center rounded-lg">
                    <QrCode className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedStudent.student_name}</h2>
                    {getStatusBadge(selectedStudent.subscription_status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedStudent.phone}</span>
                    </div>
                    {selectedStudent.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedStudent.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Seat: {selectedStudent.seat_number || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>₹{selectedStudent.monthly_fee - (selectedStudent.discount_amount || 0)}/month</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Duration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(selectedStudent.registration_date).toLocaleDateString()} 
                  ({calculateDuration(selectedStudent.registration_date)})
                </p>
              </div>

              {payments.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Payment History</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {payments.map((payment, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-muted/50 rounded"
                      >
                        <span className="text-sm">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </span>
                        <span className="font-semibold">₹{payment.amount}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Paid:</span>
                      <span>₹{payments.reduce((sum, p) => sum + Number(p.amount), 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default QRCodes;
