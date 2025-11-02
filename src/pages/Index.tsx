import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import heroImage from "@/assets/hero-image.jpg";
import { MapPin, Briefcase, Search } from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  companies: { name: string; category: string };
  job_skills: { skills: { name: string } }[];
}

const Index = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          description,
          location,
          companies (name, category),
          job_skills (skills (name))
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.companies.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[500px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80" />
        </div>
        <div className="relative container h-full flex flex-col justify-center items-start text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 max-w-3xl">
            Find Your Perfect Career Match
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl opacity-95">
            AI-powered recruitment connecting talent with opportunity
          </p>
          <div className="flex gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth?type=applicant">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white hover:bg-white/20" asChild>
              <Link to="/auth?type=company">Post a Job</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <section className="container py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">Available Opportunities</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by job title, company, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {job.companies.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </div>
                  {job.job_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.job_skills.slice(0, 3).map((js, idx) => (
                        <Badge key={idx} variant="secondary">
                          {js.skills.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button asChild className="w-full">
                    <Link to={`/jobs/${job.id}`}>View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No jobs found matching your search.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
};

export default Index;