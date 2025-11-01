import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Application {
  id: string;
  match_score: number | null;
  status: string;
  created_at: string;
  ai_analysis: any;
  recommended_jobs: any;
  jobs: {
    title: string;
    companies: {
      company_name: string;
    };
  };
}

const ApplicantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          jobs!inner(
            title,
            companies!inner(company_name)
          )
        `)
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: unknown) {
      console.error("Failed to load applications:", error);
      const message = error instanceof Error ? error.message : "Failed to load applications";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="outline">Analyzing...</Badge>;
    if (score >= 80) return <Badge className="bg-success text-success-foreground">Excellent Match</Badge>;
    if (score >= 60) return <Badge className="bg-warning text-warning-foreground">Good Match</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Applicant Dashboard</h1>
        <p className="text-muted-foreground">Track your applications and discover new opportunities</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Match Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => a.match_score).length > 0
                ? Math.round(
                    applications.reduce((sum, a) => sum + (a.match_score || 0), 0) /
                      applications.filter(a => a.match_score).length
                  )
                : "N/A"}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => a.status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Your Applications</h2>
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
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't applied to any jobs yet</p>
              <Button onClick={() => navigate("/")}>Browse Jobs</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{app.jobs.title}</CardTitle>
                      <CardDescription>{app.jobs.companies.company_name}</CardDescription>
                    </div>
                    {getScoreBadge(app.match_score)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Applied {new Date(app.created_at).toLocaleDateString()}
                      </div>
                      {app.match_score !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Match Score:</span>
                          <span className={`text-2xl font-bold ${getScoreColor(app.match_score)}`}>
                            {app.match_score}%
                          </span>
                        </div>
                      )}
                    </div>
                    {app.ai_analysis && (
                      <div className="text-right">
                        <div className="text-sm font-medium mb-1">Extracted Skills:</div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {(app.ai_analysis.skills || []).slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Jobs */}
      {applications.some(a => a.recommended_jobs) && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Based on your CV analysis, we found jobs that match your skills. Check the homepage to explore them!
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ApplicantDashboard;