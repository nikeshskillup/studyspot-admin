import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Armchair, CreditCard, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    occupiedSeats: 0,
    totalSeats: 50,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: students } = await supabase
        .from("students")
        .select("subscription_status, monthly_fee, discount_amount");

      const { data: seats } = await supabase
        .from("seats")
        .select("status")
        .eq("status", "occupied");

      const { data: settings } = await supabase
        .from("settings")
        .select("total_seats")
        .single();

      const totalStudents = students?.length || 0;
      const activeStudents =
        students?.filter((s) => s.subscription_status === "active").length || 0;
      const occupiedSeats = seats?.length || 0;
      const totalSeats = settings?.total_seats || 50;

      const monthlyRevenue =
        students?.reduce((sum, s) => {
          if (s.subscription_status === "active") {
            return sum + (s.monthly_fee || 0) - (s.discount_amount || 0);
          }
          return sum;
        }, 0) || 0;

      setStats({
        totalStudents,
        activeStudents,
        occupiedSeats,
        totalSeats,
        monthlyRevenue,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      description: `${stats.activeStudents} active`,
    },
    {
      title: "Seat Occupancy",
      value: `${stats.occupiedSeats}/${stats.totalSeats}`,
      icon: Armchair,
      description: `${Math.round((stats.occupiedSeats / stats.totalSeats) * 100)}% occupied`,
    },
    {
      title: "Monthly Revenue",
      value: `₹${stats.monthlyRevenue.toFixed(2)}`,
      icon: TrendingUp,
      description: "Expected this month",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeStudents,
      icon: CreditCard,
      description: "Current active users",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to StudySpot Admin Portal
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <a
                href="/dashboard/students"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <Users className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-foreground">Add Student</h3>
                <p className="text-sm text-muted-foreground">
                  Register a new student
                </p>
              </a>
              <a
                href="/dashboard/fees"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <CreditCard className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-foreground">Record Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Add a fee payment
                </p>
              </a>
              <a
                href="/dashboard/seats"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <Armchair className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-foreground">Manage Seats</h3>
                <p className="text-sm text-muted-foreground">
                  View and assign seats
                </p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;