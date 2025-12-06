import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAttendance } from "@/hooks/useAttendance";
import QRScanner from "@/components/QRScanner";
import {
  QrCode,
  LogIn,
  LogOut,
  Users,
  Clock,
  Search,
  Camera,
} from "lucide-react";

interface StudentInfo {
  id: string;
  student_name: string;
  student_id: string;
  seat_number: string | null;
  phone: string;
  subscription_status: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  check_in: string;
  check_out: string | null;
  students?: {
    student_name: string;
    student_id: string;
    seat_number: string | null;
    phone: string;
  };
}

const Attendance = () => {
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<StudentInfo | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<AttendanceRecord[]>([]);
  const [manualId, setManualId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const { loading, checkIn, checkOut, getStudentByQR, getTodayAttendance, getActiveCheckIns } =
    useAttendance();

  useEffect(() => {
    loadAttendanceData();
  }, [refreshKey]);

  const loadAttendanceData = async () => {
    const [today, active] = await Promise.all([
      getTodayAttendance(),
      getActiveCheckIns(),
    ]);
    setTodayAttendance(today);
    setActiveCheckIns(active);
  };

  const handleQRScan = async (scannedText: string) => {
    // Parse the scanned text - could be student_id or full URL
    let studentIdentifier = scannedText;
    
    // If it's a URL, extract the student ID
    if (scannedText.includes("/verify/")) {
      const parts = scannedText.split("/verify/");
      studentIdentifier = parts[parts.length - 1];
    }

    const student = await getStudentByQR(studentIdentifier);
    if (student) {
      setScannedStudent(student);
      setShowActionDialog(true);
    }
  };

  const handleManualSearch = async () => {
    if (!manualId.trim()) return;
    const student = await getStudentByQR(manualId.trim());
    if (student) {
      setScannedStudent(student);
      setShowActionDialog(true);
    }
    setManualId("");
  };

  const handleCheckIn = async () => {
    if (!scannedStudent) return;
    const result = await checkIn(scannedStudent.id);
    if (result.success) {
      setShowActionDialog(false);
      setScannedStudent(null);
      setRefreshKey((k) => k + 1);
    }
  };

  const handleCheckOut = async () => {
    if (!scannedStudent) return;
    const result = await checkOut(scannedStudent.id);
    if (result.success || result.action === "not_checked_in") {
      setShowActionDialog(false);
      setScannedStudent(null);
      setRefreshKey((k) => k + 1);
    }
  };

  const handleQuickCheckOut = async (studentUUID: string) => {
    await checkOut(studentUUID);
    setRefreshKey((k) => k + 1);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground mt-2">
              QR-based check-in and check-out tracking
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Currently Present
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCheckIns.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Check-ins
              </CardTitle>
              <LogIn className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAttendance.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Checked Out Today
              </CardTitle>
              <LogOut className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayAttendance.filter((a) => a.check_out).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scanner Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setScannerActive(!scannerActive)}
                className="w-full"
                variant={scannerActive ? "destructive" : "default"}
              >
                <Camera className="h-4 w-4 mr-2" />
                {scannerActive ? "Stop Scanner" : "Start Scanner"}
              </Button>

              <QRScanner onScan={handleQRScan} isActive={scannerActive} />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or enter manually
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter Student ID (e.g., SS1000)"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleManualSearch}>Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Currently Present */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Currently Present ({activeCheckIns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeCheckIns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students currently checked in
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activeCheckIns.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {record.students?.student_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.students?.student_id} •{" "}
                          {record.students?.seat_number || "No seat"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          In: {formatTime(record.check_in)} (
                          {calculateDuration(record.check_in, null)})
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickCheckOut(record.student_id)}
                        disabled={loading}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Attendance Log */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance Log</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records for today
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {record.students?.student_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.students?.student_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.students?.seat_number || "-"}
                      </TableCell>
                      <TableCell>{formatTime(record.check_in)}</TableCell>
                      <TableCell>
                        {record.check_out ? formatTime(record.check_out) : "-"}
                      </TableCell>
                      <TableCell>
                        {calculateDuration(record.check_in, record.check_out)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={record.check_out ? "secondary" : "default"}
                        >
                          {record.check_out ? "Completed" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Found</DialogTitle>
          </DialogHeader>
          {scannedStudent && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-xl font-bold">
                  {scannedStudent.student_name}
                </h3>
                <p className="text-muted-foreground">
                  {scannedStudent.student_id}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge
                    variant={
                      scannedStudent.subscription_status === "active"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {scannedStudent.subscription_status.toUpperCase()}
                  </Badge>
                  {scannedStudent.seat_number && (
                    <Badge variant="outline">
                      Seat: {scannedStudent.seat_number}
                    </Badge>
                  )}
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="flex-1"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Check Out
                </Button>
                <Button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="flex-1"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Attendance;
