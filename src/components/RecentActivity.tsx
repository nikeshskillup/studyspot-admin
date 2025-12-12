import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CreditCard, ScanLine } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: "student" | "payment" | "attendance";
  description: string;
  timestamp: string;
}

const RecentActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const [studentsRes, paymentsRes, attendanceRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("payments")
          .select("id, amount, payment_date")
          .order("payment_date", { ascending: false })
          .limit(5),
        supabase
          .from("attendance")
          .select("id, type, timestamp, students(name)")
          .order("timestamp", { ascending: false })
          .limit(5),
      ]);

      const allActivities: Activity[] = [];

      studentsRes.data?.forEach((s) => {
        allActivities.push({
          id: `student-${s.id}`,
          type: "student",
          description: `New student registered: ${s.name}`,
          timestamp: s.created_at,
        });
      });

      paymentsRes.data?.forEach((p) => {
        allActivities.push({
          id: `payment-${p.id}`,
          type: "payment",
          description: `Payment received: ₹${p.amount}`,
          timestamp: p.payment_date,
        });
      });

      attendanceRes.data?.forEach((a: { id: string; type: string; timestamp: string; students: { name: string } | null }) => {
        allActivities.push({
          id: `attendance-${a.id}`,
          type: "attendance",
          description: `${a.students?.name || "Student"} ${a.type === "check-in" ? "checked in" : "checked out"}`,
          timestamp: a.timestamp,
        });
      });

      allActivities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 10));
      setLoading(false);
    };

    fetchActivities();
  }, []);

  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "student":
        return <UserPlus className="h-4 w-4" />;
      case "payment":
        return <CreditCard className="h-4 w-4" />;
      case "attendance":
        return <ScanLine className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: Activity["type"]) => {
    switch (type) {
      case "student":
        return "default";
      case "payment":
        return "secondary";
      case "attendance":
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <div className="p-2 rounded-full bg-muted">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge variant={getBadgeVariant(activity.type)}>
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
