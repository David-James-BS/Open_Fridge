-- Fix remaining search_path issues
CREATE OR REPLACE FUNCTION public.check_vendor_active_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.food_listings 
    WHERE vendor_id = NEW.vendor_id 
    AND status = 'active' 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Vendor can only have one active listing at a time';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_best_before()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.best_before <= NOW() THEN
    RAISE EXCEPTION 'Best before time must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_complete_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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