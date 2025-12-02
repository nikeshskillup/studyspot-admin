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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Seat {
  id: string;
  seat_number: string;
  status: string;
}

interface AddStudentDialogProps {
  onStudentAdded: () => void;
}

const AddStudentDialog = ({ onStudentAdded }: AddStudentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [formData, setFormData] = useState({
    student_name: "",
    phone: "",
    email: "",
    monthly_fee: "",
    discount_amount: "0",
    seat_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchAvailableSeats();
    }
  }, [open]);

  useEffect(() => {
    // Subscribe to realtime updates for seats
    const channel = supabase
      .channel('available-seats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats'
        },
        () => {
          if (open) {
            fetchAvailableSeats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  const fetchAvailableSeats = async () => {
    const { data, error } = await supabase
      .from("seats")
      .select("*")
      .eq("status", "available")
      .order("seat_number", { ascending: true });

    if (!error && data) {
      setAvailableSeats(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selectedSeat = availableSeats.find(s => s.id === formData.seat_id);
    
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .insert({
        student_name: formData.student_name,
        phone: formData.phone,
        email: formData.email || null,
        monthly_fee: parseFloat(formData.monthly_fee),
        discount_amount: parseFloat(formData.discount_amount),
        subscription_status: "active",
        seat_number: selectedSeat?.seat_number || null,
      })
      .select()
      .single();

    if (studentError) {
      toast.error("Failed to add student: " + studentError.message);
      setLoading(false);
      return;
    }

    if (formData.seat_id && studentData) {
      const { error: seatError } = await supabase
        .from("seats")
        .update({
          status: "occupied",
          student_id: studentData.id,
        })
        .eq("id", formData.seat_id);

      if (seatError) {
        toast.error("Student added but seat assignment failed");
      }
    }

    toast.success("Student added successfully!");
    setFormData({
      student_name: "",
      phone: "",
      email: "",
      monthly_fee: "",
      discount_amount: "0",
      seat_id: "",
    });
    setOpen(false);
    onStudentAdded();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student details to register them in the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student_name">Student Name *</Label>
            <Input
              id="student_name"
              placeholder="Enter student name"
              value={formData.student_name}
              onChange={(e) =>
                setFormData({ ...formData, student_name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_fee">Monthly Fee (₹) *</Label>
              <Input
                id="monthly_fee"
                type="number"
                min="0"
                step="0.01"
                placeholder="1000"
                value={formData.monthly_fee}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_fee: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_amount">Discount (₹)</Label>
              <Input
                id="discount_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={formData.discount_amount}
                onChange={(e) =>
                  setFormData({ ...formData, discount_amount: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seat">Seat Assignment (Optional)</Label>
            <Select
              value={formData.seat_id}
              onValueChange={(value) =>
                setFormData({ ...formData, seat_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a seat" />
              </SelectTrigger>
              <SelectContent>
                {availableSeats.map((seat) => (
                  <SelectItem key={seat.id} value={seat.id}>
                    Seat {seat.seat_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {loading ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
