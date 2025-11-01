import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Briefcase, DollarSign, Upload } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  location: string;
  employment_type: string | null;
  salary_range: string | null;
  companies: {
    company_name: string;
    location: string;
    category: string;
  };
}

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (id) fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          companies!inner(company_name, location, category)
        `)
        .eq("id", id)
        .eq("status", "active")
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error: unknown) {
      console.error("Failed to load job:", error);
      toast.error("Job not found");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error("Please sign in to apply");
      navigate("/auth");
      return;
    }

    if (!cvFile) {
      toast.error("Please upload your CV");
      return;
    }

    setApplying(true);

    try {
      // Upload CV
      const fileExt = cvFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(fileName, cvFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("cvs")
        .getPublicUrl(fileName);

      // Create application
      const { data: newApplication, error: applicationError } = await supabase
        .from("applications")
        .insert({
          job_id: id,
          applicant_id: user.id,
          cv_url: publicUrl,
          cover_letter: coverLetter || null,
          status: "pending",
        })
        .select()
        .single();

      if (applicationError) {
        if (applicationError.code === "23505") {
          toast.error("You have already applied for this job");
        } else {
          throw applicationError;
        }
        return;
      }

      // Trigger AI analysis
      setTimeout(async () => {
        try {
          await supabase.functions.invoke("analyze-cv", {
            body: { application_id: newApplication.id },
          });
        } catch (error) {
          console.error("AI analysis trigger failed:", error);
        }
      }, 1000);

      toast.success("Application submitted! AI analysis in progress...");
      setShowApplyModal(false);
      navigate("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit application";
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                <CardDescription className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {job.companies.company_name}
                </CardDescription>
              </div>
              <Button size="lg" onClick={() => user ? setShowApplyModal(true) : navigate("/auth")}>
                Apply Now
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{job.location}</span>
              </div>
              {job.employment_type && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-5 w-5" />
                  <span>{job.employment_type}</span>
                </div>
              )}
              {job.salary_range && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-5 w-5" />
                  <span>{job.salary_range}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{job.companies.category}</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Job Description</h3>
              <p className="text-muted-foreground whitespace-pre-line">{job.description}</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((skill) => (
                  <Badge key={skill} className="text-sm px-3 py-1">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>
              Upload your CV and optionally add a cover letter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cv">CV / Resume (PDF or DOCX, max 10MB)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <input
                  id="cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="cv" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {cvFile ? cvFile.name : "Click to upload your CV"}
                  </p>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
              <Textarea
                id="coverLetter"
                placeholder="Tell us why you're a great fit for this role..."
                rows={5}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            <Button
              onClick={handleApply}
              disabled={applying || !cvFile}
              className="w-full"
            >
              {applying ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetails;