-- Storage RLS policies for private 'licenses' bucket to allow user-only uploads and admin read access
-- Safely drop existing policies if they exist to avoid conflicts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload license files'
  ) THEN
    EXECUTE 'DROP POLICY "Users can upload license files" ON storage.objects';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can read own license files'
  ) THEN
    EXECUTE 'DROP POLICY "Users can read own license files" ON storage.objects';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own license files'
  ) THEN
    EXECUTE 'DROP POLICY "Users can delete own license files" ON storage.objects';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can read all license files'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can read all license files" ON storage.objects';
  END IF;
END $$;

-- Allow authenticated users to upload to their own folder in the 'licenses' bucket
CREATE POLICY "Users can upload license files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'licenses'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own license files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own license files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'licenses'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to read all license files
CREATE POLICY "Admins can read all license files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses'
  AND public.has_role(auth.uid(), 'admin')
);
