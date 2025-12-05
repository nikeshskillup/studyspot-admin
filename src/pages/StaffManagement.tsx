import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";

interface StaffMember {
  id: string;
  user_id: string;
  role: "admin" | "staff";
  created_at: string;
  email?: string;
}

const StaffManagement = () => {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const { logAction } = useAuditLog();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!roleLoading && role !== "admin") {
      toast.error("Access denied. Admins only.");
      navigate("/dashboard");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.email || !newStaff.password) {
      toast.error("Please fill all fields");
      return;
    }

    setCreating(true);
    try {
      // Create user via edge function (we'll create this)
      const { data, error } = await supabase.functions.invoke("create-staff", {
        body: { email: newStaff.email, password: newStaff.password },
      });

      if (error) throw error;

      await logAction({
        action: "Created staff account",
        tableName: "user_roles",
        details: { email: newStaff.email },
      });

      toast.success("Staff account created successfully");
      setNewStaff({ email: "", password: "" });
      setDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error("Error creating staff:", error);
      toast.error(error.message || "Failed to create staff account");
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveStaff = async (staffMember: StaffMember) => {
    if (staffMember.role === "admin") {
      toast.error("Cannot remove admin accounts");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", staffMember.id);

      if (error) throw error;

      await logAction({
        action: "Removed staff access",
        tableName: "user_roles",
        recordId: staffMember.id,
        details: { user_id: staffMember.user_id },
      });

      toast.success("Staff access removed");
      fetchStaff();
    } catch (error) {
      console.error("Error removing staff:", error);
      toast.error("Failed to remove staff");
    }
  };

  if (roleLoading || role !== "admin") {
    return null;
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground mt-1">Manage admin and staff accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
              <DialogDescription>
                Create a new staff account with limited access permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="staff@studyspot.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Password</Label>
                <Input
                  id="staff-password"
                  type="password"
                  placeholder="Enter password"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
                <Shield className="h-4 w-4 inline mr-2" />
                Staff can only: Add students, Record fees, Reallocate seats
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Staff Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All admin and staff accounts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No staff members found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-sm">
                      {member.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.created_at || "").toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStaff(member)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
};

export default StaffManagement;
