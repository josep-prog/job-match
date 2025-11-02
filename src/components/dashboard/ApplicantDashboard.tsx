import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, FileCheck, TrendingUp } from "lucide-react";

interface Application {
  id: string;
  status: string;
  jobs: {
    title: string;
    companies: { name: string };
  };
  application_analysis: {
    relevance_score: number;
    suggested_jobs: any;
  } | null;
}

const ApplicantDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicantId, setApplicantId] = useState<string>("");

  useEffect(() => {
    fetchApplicantData();
  }, []);

  const fetchApplicantData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (applicant) {
      setApplicantId(applicant.id);
      fetchApplications(applicant.id);
    }
  };

  const fetchApplications = async (applicantId: string) => {
    const { data } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        jobs (
          title,
          companies (name)
        ),
        application_analysis (
          relevance_score,
          suggested_jobs
        )
      `)
      .eq("applicant_id", applicantId)
      .order("created_at", { ascending: false });

    setApplications((data as any) || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "reviewed": return "default";
      case "accepted": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
        <p className="text-muted-foreground">Track your applications and discover new opportunities</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => a.status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Applications</h2>
        <Button asChild>
          <Link to="/">Browse Jobs</Link>
        </Button>
      </div>

      {applications.length > 0 ? (
        <div className="grid gap-6">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{application.jobs.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {application.jobs.companies.name}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {application.application_analysis && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Match Score: {application.application_analysis.relevance_score}%
                    </p>
                    {application.application_analysis.suggested_jobs && (
                      <p className="text-sm text-muted-foreground">
                        AI suggested {JSON.parse(application.application_analysis.suggested_jobs as string).length} other matching jobs
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You haven't applied to any jobs yet</p>
            <Button asChild>
              <Link to="/">Explore Opportunities</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApplicantDashboard;