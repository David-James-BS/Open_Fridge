-- Add reserved_portions column to food_listings
ALTER TABLE public.food_listings 
ADD COLUMN reserved_portions integer NOT NULL DEFAULT 0;

-- Function to update reserved_portions
CREATE OR REPLACE FUNCTION public.sync_reserved_portions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  listing_id_var uuid;
  total_reserved integer;
BEGIN
  -- Get the listing_id from the trigger operation
  IF TG_OP = 'DELETE' THEN
    listing_id_var := OLD.listing_id;
  ELSE
    listing_id_var := NEW.listing_id;
  END IF;

  -- Calculate total reserved portions (not yet collected) for this listing
  SELECT COALESCE(SUM(portions_reserved), 0)
  INTO total_reserved
  FROM public.reservations
  WHERE listing_id = listing_id_var
    AND collected = false;

  -- Update the food_listings table
  UPDATE public.food_listings
  SET reserved_portions = total_reserved
  WHERE id = listing_id_var;

  RETURN NULL;
END;
$$;

-- Create trigger on reservations table to sync reserved_portions
DROP TRIGGER IF EXISTS sync_reserved_portions_trigger ON public.reservations;
CREATE TRIGGER sync_reserved_portions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.sync_reserved_portions();

-- Initialize reserved_portions for existing listings
UPDATE public.food_listings fl
SET reserved_portions = COALESCE((
  SELECT SUM(r.portions_reserved)
  FROM public.reservations r
  WHERE r.listing_id = fl.id
    AND r.collected = false
), 0);