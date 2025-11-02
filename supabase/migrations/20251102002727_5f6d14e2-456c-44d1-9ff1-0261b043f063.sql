-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('company', 'applicant', 'admin');

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rdb_certificate TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create applicants table
CREATE TABLE public.applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cv_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create skills table
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create job_skills junction table
CREATE TABLE public.job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(job_id, skill_id)
);

-- Create applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  cv_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- Create application_analysis table for ML results
CREATE TABLE public.application_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL UNIQUE,
  relevance_score DECIMAL(5,2),
  extracted_skills JSONB,
  match_summary TEXT,
  suggested_jobs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_analysis ENABLE ROW LEVEL SECURITY;

-- Profiles policies (users can read their own profile)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Companies policies
CREATE POLICY "Companies can view own data" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Companies can insert own data" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Companies can update own data" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view companies" ON public.companies
  FOR SELECT USING (true);

-- Applicants policies
CREATE POLICY "Applicants can view own data" ON public.applicants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Applicants can insert own data" ON public.applicants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Applicants can update own data" ON public.applicants
  FOR UPDATE USING (auth.uid() = user_id);

-- Skills policies (public read)
CREATE POLICY "Anyone can view skills" ON public.skills
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert skills" ON public.skills
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Jobs policies
CREATE POLICY "Anyone can view active jobs" ON public.jobs
  FOR SELECT USING (true);

CREATE POLICY "Companies can insert own jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = jobs.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update own jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = jobs.company_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete own jobs" ON public.jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = jobs.company_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Job skills policies
CREATE POLICY "Anyone can view job skills" ON public.job_skills
  FOR SELECT USING (true);

CREATE POLICY "Companies can manage job skills" ON public.job_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      JOIN public.companies ON jobs.company_id = companies.id
      WHERE jobs.id = job_skills.job_id 
      AND companies.user_id = auth.uid()
    )
  );

-- Applications policies
CREATE POLICY "Applicants can view own applications" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applicants 
      WHERE applicants.id = applications.applicant_id 
      AND applicants.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view applications to their jobs" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      JOIN public.companies ON jobs.company_id = companies.id
      WHERE jobs.id = applications.job_id 
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Applicants can insert own applications" ON public.applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applicants 
      WHERE applicants.id = applications.applicant_id 
      AND applicants.user_id = auth.uid()
    )
  );

-- Application analysis policies
CREATE POLICY "Applicants can view own analysis" ON public.application_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications
      JOIN public.applicants ON applications.applicant_id = applicants.id
      WHERE applications.id = application_analysis.application_id
      AND applicants.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view analysis for their jobs" ON public.application_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications
      JOIN public.jobs ON applications.job_id = jobs.id
      JOIN public.companies ON jobs.company_id = companies.id
      WHERE applications.id = application_analysis.application_id
      AND companies.user_id = auth.uid()
    )
  );

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);

-- Storage policies for CVs
CREATE POLICY "Applicants can upload own CVs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cvs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Applicants can view own CVs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cvs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Companies can view CVs of applicants to their jobs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cvs' AND
    EXISTS (
      SELECT 1 FROM public.applications
      JOIN public.jobs ON applications.job_id = jobs.id
      JOIN public.companies ON jobs.company_id = companies.id
      WHERE companies.user_id = auth.uid()
      AND applications.cv_url LIKE '%' || name || '%'
    )
  );

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();