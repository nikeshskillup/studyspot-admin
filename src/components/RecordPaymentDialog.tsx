import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  student_name: string;
  monthly_fee: number;
  discount_amount: number;
}

interface RecordPaymentDialogProps {
  onPaymentAdded: () => void;
}

const RecordPaymentDialog = ({ onPaymentAdded }: RecordPaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open]);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, student_name, monthly_fee, discount_amount")
      .eq("subscription_status", "active")
      .order("student_name", { ascending: true });

    if (!error && data) {
      setStudents(data);
    }
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (student) {
      const finalAmount = student.monthly_fee - (student.discount_amount || 0);
      setFormData({
        ...formData,
        student_id: studentId,
        amount: finalAmount.toString(),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("payments").insert({
      student_id: formData.student_id,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      notes: formData.notes || null,
      payment_date: new Date().toISOString(),
    });

    if (error) {
      toast.error("Failed to record payment: " + error.message);
    } else {
      toast.success("Payment recorded successfully!");
      setFormData({
        student_id: "",
        amount: "",
        payment_method: "cash",
        notes: "",
      });
      setOpen(false);
      onPaymentAdded();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a fee payment from a student.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select
              value={formData.student_id}
              onValueChange={handleStudentChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.student_name} - ₹
                    {student.monthly_fee - (student.discount_amount || 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="1000"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_method: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
