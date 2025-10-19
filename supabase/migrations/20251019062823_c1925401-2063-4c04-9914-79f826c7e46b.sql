-- Update validate_best_before to allow non-active updates and use Singapore time
CREATE OR REPLACE FUNCTION public.validate_best_before()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow updates that change status to a non-active state regardless of time
  IF TG_OP = 'UPDATE' AND NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Enforce only when resulting status is active
  IF NEW.status = 'active' THEN
    -- Compare using Asia/Singapore local time to match business expectations
    IF (NEW.best_before AT TIME ZONE 'Asia/Singapore') <= (NOW() AT TIME ZONE 'Asia/Singapore') THEN
      RAISE EXCEPTION 'Best before time must be in the future';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Optional: ensure auto expiry check also aligns with Singapore time
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
  
  -- Mark as expired if best_before time has passed (Asia/Singapore)
  IF (NEW.best_before AT TIME ZONE 'Asia/Singapore') < (NOW() AT TIME ZONE 'Asia/Singapore') AND NEW.status = 'active' THEN
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