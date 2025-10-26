-- Create storage policies for licenses bucket
-- Allow users to upload their own license files
CREATE POLICY "Users can upload own license files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'licenses' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own license files
CREATE POLICY "Users can view own license files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all license files
CREATE POLICY "Admins can view all license files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to delete their own license files
CREATE POLICY "Users can delete own license files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'licenses' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);