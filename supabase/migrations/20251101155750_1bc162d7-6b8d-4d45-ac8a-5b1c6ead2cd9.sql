-- Add new columns to profiles table for charitable organizations
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
ADD COLUMN IF NOT EXISTS organization_description TEXT;

-- Create organisation_collections table
CREATE TABLE IF NOT EXISTS public.organisation_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  portions_collected INTEGER NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organisation_collections
ALTER TABLE public.organisation_collections ENABLE ROW LEVEL SECURITY;

-- RLS policies for organisation_collections
CREATE POLICY "Organisations can view own collections"
ON public.organisation_collections
FOR SELECT
USING (auth.uid() = organisation_id);

CREATE POLICY "Organisations can create collections"
ON public.organisation_collections
FOR INSERT
WITH CHECK (auth.uid() = organisation_id AND has_role(auth.uid(), 'charitable_organisation'));

CREATE POLICY "Vendors can view collections for their listings"
ON public.organisation_collections
FOR SELECT
USING (
  auth.uid() IN (
    SELECT vendor_id 
    FROM public.food_listings 
    WHERE id = organisation_collections.listing_id
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organisation_collections_organisation_id 
ON public.organisation_collections(organisation_id);

CREATE INDEX IF NOT EXISTS idx_organisation_collections_listing_id 
ON public.organisation_collections(listing_id);