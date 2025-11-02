import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Onboarding = () => {
  const { type } = useParams<{ type: "company" | "applicant" }>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const completeOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      try {
        // Create profile
        await supabase.from("profiles").insert({
          user_id: session.user.id,
          role: type as "company" | "applicant"
        });

        if (type === "company" && location.state) {
          const { name, category, rdb_certificate, location: companyLocation } = location.state as any;
          await supabase.from("companies").insert({
            user_id: session.user.id,
            name,
            category,
            rdb_certificate,
            location: companyLocation
          });
        } else if (type === "applicant" && location.state) {
          const { full_name } = location.state as any;
          await supabase.from("applicants").insert({
            user_id: session.user.id,
            full_name,
            email: session.user.email!
          });
        }

        toast.success("Account created successfully!");
        navigate("/dashboard");
      } catch (error: any) {
        toast.error(error.message || "Failed to complete onboarding");
        navigate("/auth");
      }
    };

    completeOnboarding();
  }, [type, location.state, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg">Setting up your account...</p>
    </div>
  );
};

export default Onboarding;