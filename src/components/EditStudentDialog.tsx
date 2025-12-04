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

interface Seat {
  id: string;
  seat_number: string;
  status: string;
  student_id: string | null;
}

interface Student {
  id: string;
  student_id: string | null;
  student_name: string;
  phone: string;
  email: string | null;
  seat_number: string | null;
  subscription_status: string;
  monthly_fee: number;
  discount_amount: number;
}

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
    student_name: "",
    phone: "",
    email: "",
    monthly_fee: "",
    discount_amount: "",
    subscription_status: "active",
    seat_id: "",
  });
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  useEffect(() => {
    if (open && student) {
      setFormData({
        student_name: student.student_name,
        phone: student.phone,
        email: student.email || "",
        monthly_fee: student.monthly_fee?.toString() || "0",
        discount_amount: student.discount_amount?.toString() || "0",
        subscription_status: student.subscription_status,
        seat_id: "",
      });
      setPaymentData({
        amount: ((student.monthly_fee || 0) - (student.discount_amount || 0)).toString(),
        payment_method: "cash",
        notes: "",
      });
      fetchSeats();
    }
  }, [open, student]);

  const fetchSeats = async () => {
    // Fetch available seats
    const { data: available, error: availableError } = await supabase
      .from("seats")
      .select("*")
      .eq("status", "available")
      .order("seat_number", { ascending: true });

    if (!availableError && available) {
      setAvailableSeats(available);
    }

    // Fetch current seat if student has one
    if (student?.seat_number) {
      const { data: current, error: currentError } = await supabase
        .from("seats")
        .select("*")
        .eq("seat_number", student.seat_number)
        .maybeSingle();

      if (!currentError && current) {
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

    // Update student profile (only phone, email, status, and seat - not name, fee, discount)
    const { error: studentError } = await supabase
      .from("students")
      .update({
        phone: formData.phone,
        email: formData.email || null,
        subscription_status: formData.subscription_status,
        seat_number: newSeatNumber,
      })
      .eq("id", student.id);

    if (studentError) {
      toast.error("Failed to update student: " + studentError.message);
      setLoading(false);
      return;
    }

    // Handle seat changes
    if (oldSeatNumber !== newSeatNumber) {
      // Free old seat if exists
      if (oldSeatNumber) {
        await supabase
          .from("seats")
          .update({ status: "available", student_id: null })
          .eq("seat_number", oldSeatNumber);
      }

      // Assign new seat if selected
      if (newSeatId && newSeatNumber) {
        await supabase
          .from("seats")
          .update({ status: "occupied", student_id: student.id })
          .eq("id", newSeatId);
      }

      // Record seat history
      await supabase.from("seat_history").insert({
        student_id: student.id,
        old_seat: oldSeatNumber,
        new_seat: newSeatNumber,
      });
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

    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const { error } = await supabase.from("payments").insert({
      student_id: student.id,
      amount: parseFloat(paymentData.amount),
      payment_method: paymentData.payment_method,
      notes: paymentData.notes || null,
      payment_date: new Date().toISOString(),
      next_due_date: nextDueDate.toISOString(),
    });

    if (error) {
      toast.error("Failed to record payment: " + error.message);
      setLoading(false);
      return;
    }

    // Update student fee due date
    await supabase
      .from("students")
      .update({ fee_due_date: nextDueDate.toISOString() })
      .eq("id", student.id);

    toast.success("Payment recorded successfully!");
    setPaymentData({
      amount: ((student.monthly_fee || 0) - (student.discount_amount || 0)).toString(),
      payment_method: "cash",
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
          <DialogTitle>Edit Student: {student.student_name}</DialogTitle>
          <DialogDescription>
            Update student profile, seat assignment, or record fee payment.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile & Seat</TabsTrigger>
            <TabsTrigger value="payment">Fee Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form onSubmit={handleUpdateProfile} className="space-y-4 mt-4">
              {student.student_id && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Student ID</div>
                  <div className="text-lg font-bold">{student.student_id}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_student_name">Student Name *</Label>
                  <Input
                    id="edit_student_name"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    required
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Name cannot be changed after registration</p>
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

              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_monthly_fee">Monthly Fee (₹) *</Label>
                  <Input
                    id="edit_monthly_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                    required
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Fee cannot be changed after registration</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_discount_amount">Discount (₹)</Label>
                  <Input
                    id="edit_discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Discount cannot be changed after registration</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    value={formData.subscription_status}
                    onValueChange={(value) => setFormData({ ...formData, subscription_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
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
                {(student.discount_amount || 0) > 0 && (
                  <div className="text-sm text-green-600">- ₹{student.discount_amount} discount</div>
                )}
                <div className="text-lg font-semibold mt-2">
                  Net: ₹{(student.monthly_fee || 0) - (student.discount_amount || 0)}
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
                  value={paymentData.payment_method}
                  onValueChange={(value) => setPaymentData({ ...paymentData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="online">Online Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
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
