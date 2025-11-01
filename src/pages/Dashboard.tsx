import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ApplicantDashboard from "@/components/dashboard/ApplicantDashboard";
import CompanyDashboard from "@/components/dashboard/CompanyDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

type UserRole = "applicant" | "company" | "admin" | null;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("No role assigned to this user");
        setLoading(false);
        return;
      }
      
      setRole(data.role as UserRole);
    } catch (error: unknown) {
      console.error("Failed to load user role:", error);
      const message = error instanceof Error ? error.message : "Failed to load user role";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {role === "applicant" && <ApplicantDashboard />}
        {role === "company" && <CompanyDashboard />}
        {role === "admin" && <AdminDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;