import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Briefcase } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  applications: { id: string }[];
}

const CompanyDashboard = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", session.user.id)
      .single();

    if (companyData) {
      setCompany(companyData);
      fetchJobs(companyData.id);
    }
  };

  const fetchJobs = async (companyId: string) => {
    const { data } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        location,
        applications (id)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    setJobs(data || []);
  };

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;

    const formData = new FormData(e.currentTarget);
    const jobData = {
      company_id: company.id,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      requirements: formData.get("requirements") as string,
      location: formData.get("location") as string,
    };

    const { error } = await supabase.from("jobs").insert(jobData);
    
    if (error) {
      toast.error("Failed to create job");
    } else {
      toast.success("Job posted successfully!");
      setOpen(false);
      fetchCompanyData();
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Company Dashboard</h1>
        <p className="text-muted-foreground">{company?.name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.reduce((acc, job) => acc + job.applications.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Job Postings</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Post New Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Job Posting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" required rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea id="requirements" name="requirements" required rows={4} />
              </div>
              <Button type="submit" className="w-full">Create Job</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>{job.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {job.applications.length} application{job.applications.length !== 1 ? "s" : ""}
              </p>
              <Button variant="outline" className="w-full">View Applications</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CompanyDashboard;