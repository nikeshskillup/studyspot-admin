import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import studySpotLogo from "@/assets/studyspot-logo.png";
import { ArrowRight } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <img src={studySpotLogo} alt="StudySpot" className="h-24 w-auto" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            StudySpot Admin
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive management system for your study spot operations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Student Management</h3>
            <p className="text-sm text-muted-foreground">
              Track registrations, seats, and subscriptions
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Fee Management</h3>
            <p className="text-sm text-muted-foreground">
              Handle payments and track revenue
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Analytics & Reports</h3>
            <p className="text-sm text-muted-foreground">
              Generate insights and export data
            </p>
          </div>
        </div>

        <div className="pt-8">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="gap-2 text-lg px-8"
          >
            Access Admin Portal
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;