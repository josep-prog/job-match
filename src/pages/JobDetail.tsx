import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { MapPin, Briefcase, Upload } from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  companies: { name: string; category: string };
  job_skills: { skills: { name: string } }[];
}

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [open, setOpen] = useState(false);
  const [applicantId, setApplicantId] = useState<string | null>(null);

  useEffect(() => {
    fetchJob();
    checkApplicant();
  }, [id]);

  const checkApplicant = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("applicants")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    setApplicantId(data?.id || null);
  };

  const fetchJob = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        description,
        requirements,
        location,
        companies (name, category),
        job_skills (skills (name))
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Job not found");
      navigate("/");
    } else {
      setJob(data);
    }
    setLoading(false);
  };

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!applicantId) {
      toast.error("Please login as an applicant to apply");
      navigate("/auth?type=applicant");
      return;
    }

    setApplying(true);
    const formData = new FormData(e.currentTarget);
    const cvFile = formData.get("cv") as File;

    if (!cvFile) {
      toast.error("Please upload your CV");
      setApplying(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Upload CV
      const fileName = `${session.user.id}/${Date.now()}_${cvFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(fileName, cvFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("cvs")
        .getPublicUrl(fileName);

      // Create application
      const { error: applicationError } = await supabase
        .from("applications")
        .insert({
          job_id: id,
          applicant_id: applicantId,
          cv_url: publicUrl
        });

      if (applicationError) throw applicationError;

      toast.success("Application submitted successfully!");
      setOpen(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16">Loading...</div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <CardTitle className="text-3xl">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <Briefcase className="h-5 w-5" />
                  {job.companies.name} • {job.companies.category}
                </CardDescription>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  {job.location}
                </div>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="lg">Apply Now</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apply to {job.title}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleApply} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cv">Upload Your CV (PDF)</Label>
                      <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <input
                          id="cv"
                          name="cv"
                          type="file"
                          accept=".pdf"
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={applying}>
                      {applying ? "Submitting..." : "Submit Application"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {job.job_skills.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.job_skills.map((js, idx) => (
                    <Badge key={idx} variant="secondary">
                      {js.skills.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3">Job Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Requirements</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetail;