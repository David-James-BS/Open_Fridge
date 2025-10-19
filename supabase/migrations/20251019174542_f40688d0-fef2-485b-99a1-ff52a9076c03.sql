-- Add name column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- Create vendor_followers table to track consumer-vendor relationships
CREATE TABLE IF NOT EXISTS public.vendor_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(consumer_id, vendor_id)
);

-- Enable RLS on vendor_followers
ALTER TABLE public.vendor_followers ENABLE ROW LEVEL SECURITY;

-- RLS policies for vendor_followers
CREATE POLICY "Users can view own follows"
  ON public.vendor_followers
  FOR SELECT
  USING (auth.uid() = consumer_id OR auth.uid() = vendor_id);

CREATE POLICY "Consumers can follow vendors"
  ON public.vendor_followers
  FOR INSERT
  WITH CHECK (auth.uid() = consumer_id AND has_role(auth.uid(), 'consumer'::app_role));

CREATE POLICY "Consumers can unfollow vendors"
  ON public.vendor_followers
  FOR DELETE
  USING (auth.uid() = consumer_id);

-- Function to notify followers when vendor posts new listing
CREATE OR REPLACE FUNCTION public.notify_followers_new_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_record RECORD;
  listing_title TEXT;
BEGIN
  listing_title := NEW.title;

  -- Notify all followers of this vendor
  FOR follower_record IN 
    SELECT consumer_id 
    FROM public.vendor_followers 
    WHERE vendor_id = NEW.vendor_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      follower_record.consumer_id,
      'New Food Listing',
      'A vendor you follow posted: "' || listing_title || '"'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger to notify followers when new listing is created
DROP TRIGGER IF EXISTS on_new_listing_notify_followers ON public.food_listings;
CREATE TRIGGER on_new_listing_notify_followers
  AFTER INSERT ON public.food_listings
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.notify_followers_new_listing();