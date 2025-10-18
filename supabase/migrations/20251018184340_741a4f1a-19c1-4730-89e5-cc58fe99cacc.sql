-- Add image support and priority window to food_listings
ALTER TABLE public.food_listings 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS priority_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS available_for_charity boolean DEFAULT true;

-- Add pickup_time to reservations (already has deposit_status from previous schema)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS pickup_time timestamp with time zone;

-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('food-images', 'food-images', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for food images
CREATE POLICY "Anyone can view food images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Vendors can upload food images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND has_role(auth.uid(), 'vendor')
);

CREATE POLICY "Vendors can update own food images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Vendors can delete own food images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Update auto_complete_listing trigger to also check priority window expiry
CREATE OR REPLACE FUNCTION public.auto_complete_listing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark as completed if no portions left
  IF NEW.remaining_portions = 0 AND OLD.remaining_portions > 0 THEN
    NEW.status = 'completed';
  END IF;
  
  -- Check if priority window has expired and listing is still active
  IF NEW.priority_until IS NOT NULL 
     AND NEW.priority_until < NOW() 
     AND NEW.status = 'active' THEN
    -- Priority window expired, listing now available to all
    NEW.priority_until = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;