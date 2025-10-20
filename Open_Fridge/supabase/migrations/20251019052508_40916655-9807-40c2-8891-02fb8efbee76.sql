-- Update the auto_complete_listing trigger to also handle expired listings
CREATE OR REPLACE FUNCTION public.auto_complete_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark as completed if no portions left
  IF NEW.remaining_portions = 0 AND OLD.remaining_portions > 0 THEN
    NEW.status = 'completed';
  END IF;
  
  -- Mark as expired if best_before time has passed
  IF NEW.best_before < NOW() AND NEW.status = 'active' THEN
    NEW.status = 'expired';
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
$function$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_auto_complete_listing ON public.food_listings;
CREATE TRIGGER trigger_auto_complete_listing
  BEFORE INSERT OR UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_complete_listing();