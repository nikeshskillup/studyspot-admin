import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Settings {
  id: string;
  total_seats: number;
  default_monthly_fee: number;
}

const Settings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    total_seats: "",
    default_monthly_fee: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (!error && data) {
      setSettings(data);
      setFormData({
        total_seats: data.total_seats.toString(),
        default_monthly_fee: data.default_monthly_fee.toString(),
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("settings")
      .update({
        total_seats: parseInt(formData.total_seats),
        default_monthly_fee: parseFloat(formData.default_monthly_fee),
      })
      .eq("id", settings?.id);

    if (error) {
      toast.error("Failed to save settings: " + error.message);
    } else {
      toast.success("Settings saved successfully!");
      fetchSettings();
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your study spot settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Manage your study spot configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading settings...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="total_seats">Total Seats</Label>
                  <Input
                    id="total_seats"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={formData.total_seats}
                    onChange={(e) =>
                      setFormData({ ...formData, total_seats: e.target.value })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Total number of seats available in your study spot
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_monthly_fee">
                    Default Monthly Fee (₹)
                  </Label>
                  <Input
                    id="default_monthly_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1000"
                    value={formData.default_monthly_fee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_monthly_fee: e.target.value,
                      })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Default monthly fee for new student registrations
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your admin account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your email in the authentication settings
                </p>
              </div>
              <div>
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Change your password through the login page
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
