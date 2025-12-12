import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Armchair, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import RecentActivity from "@/components/RecentActivity";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    occupiedSeats: 0,
    totalSeats: 50,
    monthlyRevenue: 0,
    pendingFees: 0,
    overdueStudents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: students } = await supabase
        .from("students")
        .select("status, monthly_fee, discount, fee_status");

      const { data: seats } = await supabase
        .from("seats")
        .select("student_id")
        .not("student_id", "is", null);

      const { data: settings } = await supabase
        .from("settings")
        .select("total_seats")
        .maybeSingle();

      const totalStudents = students?.length || 0;
      const activeStudents = students?.filter((s) => s.status === "active").length || 0;
      const occupiedSeats = seats?.length || 0;
      const totalSeats = settings?.total_seats || 50;

      const monthlyRevenue = students?.reduce((sum, s) => {
        if (s.status === "active") {
          return sum + (s.monthly_fee || 0) - (s.discount || 0);
        }
        return sum;
      }, 0) || 0;

      const overdueStudents = students?.filter((s) => s.fee_status === "overdue").length || 0;
      const pendingStudents = students?.filter((s) => s.fee_status === "pending" || s.fee_status === "overdue") || [];
      const pendingFees = pendingStudents.reduce((sum, s) => sum + (s.monthly_fee || 0) - (s.discount || 0), 0);

      setStats({
        totalStudents,
        activeStudents,
        occupiedSeats,
        totalSeats,
        monthlyRevenue,
        pendingFees,
        overdueStudents,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Students", value: stats.totalStudents, icon: Users, description: `${stats.activeStudents} active` },
    { title: "Seat Occupancy", value: `${stats.occupiedSeats}/${stats.totalSeats}`, icon: Armchair, description: `${Math.round((stats.occupiedSeats / stats.totalSeats) * 100)}% occupied` },
    { title: "Monthly Revenue", value: `₹${stats.monthlyRevenue.toFixed(0)}`, icon: TrendingUp, description: "Expected this month" },
    { title: "Pending Fees", value: `₹${stats.pendingFees.toFixed(0)}`, icon: AlertCircle, description: `${stats.overdueStudents} students overdue`, highlight: stats.overdueStudents > 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to StudySpot Admin Portal</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className={stat.highlight ? "border-destructive" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.highlight ? "text-destructive" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.highlight ? "text-destructive" : "text-foreground"}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentActivity />
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <a href="/dashboard/students" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground">Add Student</h3>
                  <p className="text-sm text-muted-foreground">Register a new student</p>
                </a>
                <a href="/dashboard/fees" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                  <CreditCard className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground">Record Payment</h3>
                  <p className="text-sm text-muted-foreground">Add a fee payment</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
