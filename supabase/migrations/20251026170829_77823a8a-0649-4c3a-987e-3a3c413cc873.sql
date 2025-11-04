-- Create table for charitable organisations following vendors
CREATE TABLE public.organisation_vendor_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, vendor_id)
);

-- Enable RLS
ALTER TABLE public.organisation_vendor_followers ENABLE ROW LEVEL SECURITY;

-- Organisations can view their own follows
CREATE POLICY "Organisations can view own follows"
ON public.organisation_vendor_followers
FOR SELECT
USING (
  auth.uid() = organisation_id 
  OR auth.uid() = vendor_id
);

-- Organisations can follow vendors
CREATE POLICY "Organisations can follow vendors"
ON public.organisation_vendor_followers
FOR INSERT
WITH CHECK (
  auth.uid() = organisation_id 
  AND has_role(auth.uid(), 'charitable_organisation'::app_role)
);

-- Organisations can unfollow vendors
CREATE POLICY "Organisations can unfollow vendors"
ON public.organisation_vendor_followers
FOR DELETE
USING (auth.uid() = organisation_id);

-- Update notify_followers_new_listing function to include organisations
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

  -- Notify consumer followers
  FOR follower_record IN 
    SELECT consumer_id AS user_id
    FROM public.vendor_followers 
    WHERE vendor_id = NEW.vendor_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      follower_record.user_id,
      'New Food Listing',
      'A vendor you follow posted: "' || listing_title || '"'
    );
  END LOOP;

  -- Notify organisation followers
  FOR follower_record IN 
    SELECT organisation_id AS user_id
    FROM public.organisation_vendor_followers 
    WHERE vendor_id = NEW.vendor_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      follower_record.user_id,
      'New Food Listing',
      'A vendor you follow posted: "' || listing_title || '"'
    );
  END LOOP;

  RETURN NEW;
END;
$$;