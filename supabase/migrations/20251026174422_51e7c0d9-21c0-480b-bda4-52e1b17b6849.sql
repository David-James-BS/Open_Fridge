-- Fix storage policies for license uploads
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own licenses" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own licenses" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own licenses" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all licenses" ON storage.objects;

-- Create proper storage policies for licenses bucket
CREATE POLICY "Users can upload own licenses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own licenses"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own licenses"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'licenses' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all licenses"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' 
  AND has_role(auth.uid(), 'admin'::app_role)
);