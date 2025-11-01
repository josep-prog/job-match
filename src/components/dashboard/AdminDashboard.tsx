import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Building2, Briefcase, Users, FileText } from "lucide-react";
import { toast } from "sonner";

interface PendingCompany {
  id: string;
  company_name: string;
  category: string;
  rdb_certificate: string;
  location: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const AdminDashboard = () => {
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalJobs: 0,
    totalApplicants: 0,
    totalApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch pending companies
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select(`
          *,
          profiles!inner(full_name, email)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (companiesError) throw companiesError;
      setPendingCompanies(companies || []);

      // Fetch stats
      const [companiesCount, jobsCount, applicantsCount, applicationsCount] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "applicant"),
        supabase.from("applications").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalCompanies: companiesCount.count || 0,
        totalJobs: jobsCount.count || 0,
        totalApplicants: applicantsCount.count || 0,
        totalApplications: applicationsCount.count || 0,
      });
    } catch (error: unknown) {
      console.error("Failed to load admin data:", error);
      const message = error instanceof Error ? error.message : "Failed to load admin data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyAction = async (companyId: string, action: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ status: action })
        .eq("id", companyId);

      if (error) throw error;

      toast.success(`Company ${action === "approved" ? "approved" : "rejected"} successfully`);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update company status";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage companies, monitor platform activity</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Job Seekers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplicants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pending Company Approvals</h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : pendingCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No pending company approvals</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingCompanies.map((company) => (
              <Card key={company.id} className="border-2 border-warning/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {company.company_name}
                        <Badge variant="outline" className="ml-2">Pending</Badge>
                      </CardTitle>
                      <CardDescription>{company.profiles.email}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCompanyAction(company.id, "approved")}
                        className="bg-success hover:bg-success/90"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCompanyAction(company.id, "rejected")}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Contact Person: </span>
                      {company.profiles.full_name}
                    </div>
                    <div>
                      <span className="font-medium">Category: </span>
                      {company.category}
                    </div>
                    <div>
                      <span className="font-medium">Location: </span>
                      {company.location}
                    </div>
                    <div>
                      <span className="font-medium">RDB Certificate: </span>
                      {company.rdb_certificate}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Registered: </span>
                      {new Date(company.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;