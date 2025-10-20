-- Create storage policies for food-images bucket to allow vendors to upload images

-- Allow authenticated users to upload their own food images
CREATE POLICY "Users can upload food images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own food images
CREATE POLICY "Users can update own food images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own food images
CREATE POLICY "Users can delete own food images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access (bucket is already public)
CREATE POLICY "Public can view food images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'food-images');