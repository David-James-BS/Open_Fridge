-- Remove the old single listing constraint
DROP TRIGGER IF EXISTS check_vendor_active_listing_trigger ON public.food_listings;
DROP FUNCTION IF EXISTS public.check_vendor_active_listing() CASCADE;

-- Create new function to enforce max 5 active listings
CREATE OR REPLACE FUNCTION public.check_vendor_listing_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) 
      FROM public.food_listings 
      WHERE vendor_id = NEW.vendor_id 
      AND status = 'active' 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 5 THEN
    RAISE EXCEPTION 'Vendor cannot have more than 5 active listings';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach trigger to food_listings table
CREATE TRIGGER enforce_listing_limit
  BEFORE INSERT OR UPDATE ON public.food_listings
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.check_vendor_listing_limit();