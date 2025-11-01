-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE app_role AS ENUM ('admin', 'company', 'applicant');
CREATE TYPE company_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE job_status AS ENUM ('active', 'closed');

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table  
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT NOT NULL,
  category TEXT NOT NULL,
  rdb_certificate TEXT NOT NULL,
  location TEXT NOT NULL,
  status company_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] NOT NULL,
  location TEXT NOT NULL,
  employment_type TEXT,
  salary_range TEXT,
  status job_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cv_url TEXT NOT NULL,
  cover_letter TEXT,
  ai_analysis JSONB,
  match_score DECIMAL(5,2),
  recommended_jobs JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "users_view_own_profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "users_view_own_roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "system_insert_roles" ON user_roles FOR INSERT WITH CHECK (true);

-- Security definer function for admin checks
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Companies policies
CREATE POLICY "view_approved_companies" ON companies FOR SELECT USING (status = 'approved');
CREATE POLICY "companies_view_own" ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "companies_insert_own" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "companies_update_own" ON companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admins_view_all_companies" ON companies FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "admins_update_companies" ON companies FOR UPDATE USING (public.is_admin(auth.uid()));

-- Jobs policies
CREATE POLICY "view_active_jobs" ON jobs FOR SELECT 
  USING (status = 'active' AND EXISTS (SELECT 1 FROM companies WHERE id = jobs.company_id AND status = 'approved'));
CREATE POLICY "companies_view_own_jobs" ON jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM companies WHERE id = jobs.company_id AND user_id = auth.uid()));
CREATE POLICY "companies_insert_jobs" ON jobs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id AND user_id = auth.uid() AND status = 'approved'));
CREATE POLICY "companies_update_own_jobs" ON jobs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM companies WHERE id = jobs.company_id AND user_id = auth.uid()));
CREATE POLICY "companies_delete_own_jobs" ON jobs FOR DELETE
  USING (EXISTS (SELECT 1 FROM companies WHERE id = jobs.company_id AND user_id = auth.uid()));

-- Applications policies
CREATE POLICY "applicants_view_own_applications" ON applications FOR SELECT USING (auth.uid() = applicant_id);
CREATE POLICY "companies_view_their_applications" ON applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = applications.job_id AND c.user_id = auth.uid()));
CREATE POLICY "applicants_insert_applications" ON applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "admins_view_all_applications" ON applications FOR SELECT USING (public.is_admin(auth.uid()));

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();