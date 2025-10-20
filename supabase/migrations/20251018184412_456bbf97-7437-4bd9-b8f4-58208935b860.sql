-- Fix security warnings by setting search_path on trigger functions
CREATE OR REPLACE FUNCTION public.notify_license_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      CASE
        WHEN NEW.status = 'approved' THEN 'License Approved!'
        WHEN NEW.status = 'rejected' THEN 'License Rejected'
        ELSE 'License Status Updated'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 'Your license has been approved. You can now create food listings!'
        WHEN NEW.status = 'rejected' THEN COALESCE('Your license was rejected. Reason: ' || NEW.rejection_reason, 'Your license was rejected.')
        ELSE 'Your license status has been updated to: ' || NEW.status
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vendor_user_id UUID;
  listing_title TEXT;
BEGIN
  SELECT fl.vendor_id, fl.title
  INTO vendor_user_id, listing_title
  FROM public.food_listings fl
  WHERE fl.id = NEW.listing_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    vendor_user_id,
    'New Reservation',
    'A charitable organisation has reserved ' || NEW.portions_reserved || ' portions from "' || listing_title || '"'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_collection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vendor_user_id UUID;
  listing_title TEXT;
BEGIN
  SELECT fl.vendor_id, fl.title
  INTO vendor_user_id, listing_title
  FROM public.food_listings fl
  WHERE fl.id = NEW.listing_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    vendor_user_id,
    'Food Collected',
    'A consumer collected ' || NEW.portions_collected || ' portions from "' || listing_title || '"'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;