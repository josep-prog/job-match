-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for CVs
CREATE POLICY "users_upload_own_cv" ON storage.objects 
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_view_own_cv" ON storage.objects 
  FOR SELECT 
  USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "companies_view_applicant_cvs" ON storage.objects 
  FOR SELECT 
  USING (
    bucket_id = 'cvs' AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE c.user_id = auth.uid()
      AND a.cv_url LIKE '%' || name || '%'
    )
  );