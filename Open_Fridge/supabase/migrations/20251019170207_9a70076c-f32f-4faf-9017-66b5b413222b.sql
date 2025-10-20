-- Drop the old public-only SELECT policy
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.food_listings;

-- Add policy for vendors to view all their own listings (any status)
CREATE POLICY "Vendors can view own listings"
ON public.food_listings
FOR SELECT
USING (auth.uid() = vendor_id);

-- Add policy for everyone to view active listings
CREATE POLICY "Anyone can view active listings"
ON public.food_listings
FOR SELECT
USING (status = 'active'::listing_status);
