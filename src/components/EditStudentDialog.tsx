import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Seat = Tables<'seats'>;
type Student = Tables<'students'>;

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentUpdated: () => void;
}

const EditStudentDialog = ({ student, open, onOpenChange, onStudentUpdated }: EditStudentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [currentSeat, setCurrentSeat] = useState<Seat | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    monthly_fee: "",
    discount: "",
    status: "active" as "active" | "inactive",
    seat_id: "",
  });
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "cash" as "cash" | "upi" | "online" | "other",
    notes: "",
  });

  useEffect(() => {
    if (open && student) {
      setFormData({
        name: student.name,
        phone: student.phone,
        monthly_fee: student.monthly_fee?.toString() || "0",
        discount: student.discount?.toString() || "0",
        status: student.status,
        seat_id: "",
      });
      setPaymentData({
        amount: ((student.monthly_fee || 0) - (student.discount || 0)).toString(),
        method: "cash",
        notes: "",
      });
      fetchSeats();
    }
  }, [open, student]);

  const fetchSeats = async () => {
    const { data: available } = await supabase
      .from("seats")
      .select("*")
      .is("student_id", null)
      .order("seat_number", { ascending: true });

    if (available) setAvailableSeats(available);

    if (student?.seat_number) {
      const { data: current } = await supabase
        .from("seats")
        .select("*")
        .eq("seat_number", student.seat_number)
        .maybeSingle();

      if (current) {
        setCurrentSeat(current);
        setFormData(prev => ({ ...prev, seat_id: current.id }));
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setLoading(true);

    const newSeatId = formData.seat_id;
    const oldSeatNumber = student.seat_number;
    const selectedSeat = [...availableSeats, currentSeat].find(s => s?.id === newSeatId);
    const newSeatNumber = selectedSeat?.seat_number || null;

    const { error: studentError } = await supabase
      .from("students")
      .update({
        phone: formData.phone,
        status: formData.status,
        seat_number: newSeatNumber,
      })
      .eq("id", student.id);

    if (studentError) {
      toast.error("Failed to update student: " + studentError.message);
      setLoading(false);
      return;
    }

    if (oldSeatNumber !== newSeatNumber) {
      if (oldSeatNumber) {
        await supabase
          .from("seats")
          .update({ student_id: null })
          .eq("seat_number", oldSeatNumber);
      }

      if (newSeatId && newSeatNumber) {
        await supabase
          .from("seats")
          .update({ student_id: student.id })
          .eq("id", newSeatId);
      }
    }

    toast.success("Student profile updated successfully!");
    onStudentUpdated();
    onOpenChange(false);
    setLoading(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setLoading(true);

    const { error } = await supabase.from("payments").insert({
      student_id: student.id,
      amount: parseFloat(paymentData.amount),
      method: paymentData.method,
      notes: paymentData.notes || null,
    });

    if (error) {
      toast.error("Failed to record payment: " + error.message);
      setLoading(false);
      return;
    }

    await supabase
      .from("students")
      .update({ fee_status: "paid" })
      .eq("id", student.id);

    toast.success("Payment recorded successfully!");
    setPaymentData({
      amount: ((student.monthly_fee || 0) - (student.discount || 0)).toString(),
      method: "cash",
      notes: "",
    });
    onStudentUpdated();
    setLoading(false);
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Student: {student.name}</DialogTitle>
          <DialogDescription>
            Update profile, seat assignment, or record payment.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile & Seat</TabsTrigger>
            <TabsTrigger value="payment">Fee Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form onSubmit={handleUpdateProfile} className="space-y-4 mt-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Student ID</div>
                <div className="text-lg font-bold">{student.ss_id}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Student Name</Label>
                  <Input
                    id="edit_name"
                    value={formData.name}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Name cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone Number *</Label>
                  <Input
                    id="edit_phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_seat">Seat Assignment</Label>
                  <Select
                    value={formData.seat_id}
                    onValueChange={(value) => setFormData({ ...formData, seat_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a seat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Seat</SelectItem>
                      {currentSeat && (
                        <SelectItem value={currentSeat.id}>
                          Seat {currentSeat.seat_number} (Current)
                        </SelectItem>
                      )}
                      {availableSeats.map((seat) => (
                        <SelectItem key={seat.id} value={seat.id}>
                          Seat {seat.seat_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="payment">
            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Monthly Fee</div>
                <div className="text-xl font-bold">₹{student.monthly_fee || 0}</div>
                {(student.discount || 0) > 0 && (
                  <div className="text-sm text-green-600">- ₹{student.discount} discount</div>
                )}
                <div className="text-lg font-semibold mt-2">
                  Net: ₹{(student.monthly_fee || 0) - (student.discount || 0)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_amount">Amount (₹) *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={paymentData.method}
                  onValueChange={(value: "cash" | "upi" | "online" | "other") => setPaymentData({ ...paymentData, method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_notes">Notes</Label>
                <Textarea
                  id="payment_notes"
                  placeholder="Any additional notes..."
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentDialog;
