import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Briefcase, Users, FileText, X } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  status: string;
  company_name: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  location: string;
  employment_type: string | null;
  salary_range: string | null;
  status: string;
  created_at: string;
}

interface Application {
  id: string;
  match_score: number | null;
  status: string;
  created_at: string;
  cv_url: string;
  ai_analysis: any;
  jobs: {
    title: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

const CompanyDashboard = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJobForm, setShowJobForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Job form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [salaryRange, setSalaryRange] = useState("");

  useEffect(() => {
    fetchCompanyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompanyData = async () => {
    try {
      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (companyError) throw companyError;
      
      if (!companyData) {
        toast.error("Company data not found");
        setLoading(false);
        return;
      }
      
      setCompany(companyData);

      if (companyData.status === "approved") {
        // Fetch jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .eq("company_id", companyData.id)
          .order("created_at", { ascending: false });

        if (jobsError) throw jobsError;
        setJobs(jobsData || []);

        // Fetch applications
        const { data: appsData, error: appsError } = await supabase
          .from("applications")
          .select(`
            *,
            jobs!inner(title),
            profiles!inner(full_name, email)
          `)
          .in("job_id", jobsData?.map(j => j.id) || [])
          .order("match_score", { ascending: false, nullsFirst: false });

        if (appsError) throw appsError;
        setApplications(appsData || []);
      }
    } catch (error: unknown) {
      console.error("Failed to load company data:", error);
      const message = error instanceof Error ? error.message : "Failed to load company data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const skillsArray = skills.split(",").map(s => s.trim()).filter(Boolean);

      const { error } = await supabase.from("jobs").insert({
        company_id: company!.id,
        title,
        description,
        required_skills: skillsArray,
        location,
        employment_type: employmentType || null,
        salary_range: salaryRange || null,
        status: "active",
      });

      if (error) throw error;

      toast.success("Job posted successfully!");
      setShowJobForm(false);
      resetForm();
      fetchCompanyData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to post job";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSkills("");
    setLocation("");
    setEmploymentType("");
    setSalaryRange("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (company?.status !== "approved") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Pending Approval</CardTitle>
          <CardDescription>Your company registration is under review</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Thank you for registering! An administrator will review your company details and approve your account soon. 
            Once approved, you'll be able to post jobs and view applications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Company Dashboard</h1>
          <p className="text-muted-foreground">{company.company_name}</p>
        </div>
        <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Post New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post a New Job</DialogTitle>
              <DialogDescription>Fill in the details for your job opening</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  placeholder="Senior Software Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role, responsibilities, and requirements..."
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Required Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  placeholder="React, TypeScript, Node.js, PostgreSQL"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Input
                    id="employmentType"
                    placeholder="Full-time, Remote"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary Range (Optional)</Label>
                <Input
                  id="salary"
                  placeholder="$120k - $180k"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Posting..." : "Post Job"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.filter(j => j.status === "active").length}</div>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium">Top Match Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(a => a.match_score && a.match_score >= 80).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posted Jobs */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Your Job Postings</h2>
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No jobs posted yet</p>
              <Button onClick={() => setShowJobForm(true)}>Post Your First Job</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription>{job.location}</CardDescription>
                    </div>
                    <Badge variant={job.status === "active" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {job.required_skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {applications.filter(a => a.jobs.title === job.title).length} applications
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Applications */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Candidate Applications</h2>
        {applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No applications received yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{app.profiles.full_name}</CardTitle>
                      <CardDescription>{app.profiles.email}</CardDescription>
                      <p className="text-sm text-muted-foreground mt-1">
                        Applied for: {app.jobs.title}
                      </p>
                    </div>
                    {app.match_score && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary">{app.match_score}%</div>
                        <div className="text-sm text-muted-foreground">Match Score</div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {app.ai_analysis && (
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Skills: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(app.ai_analysis.skills || []).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {app.ai_analysis.experience_years && (
                        <p className="text-sm text-muted-foreground">
                          Experience: {app.ai_analysis.experience_years} years
                        </p>
                      )}
                    </div>
                  )}
                  <Button variant="outline" className="mt-3" asChild>
                    <a href={app.cv_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      View CV
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboard;