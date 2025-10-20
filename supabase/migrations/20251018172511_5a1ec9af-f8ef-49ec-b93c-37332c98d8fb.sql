-- Phase 1: Security Fixes and Core Backend Setup

-- 1.1 Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('consumer', 'vendor', 'charitable_organisation', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 1.2 Drop existing policies that depend on profiles.role column
DROP POLICY IF EXISTS "Admins can view all licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Organisations can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Consumers can create collections" ON public.collections;

-- Remove role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- Add INSERT policy for profiles
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 1.3 Create licenses storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'licenses',
  'licenses',
  false,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
);

-- RLS policies for licenses bucket
CREATE POLICY "Users can upload own license"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'licenses' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own license"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'licenses' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all licenses in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'licenses' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 1.4 Recreate RLS policies using has_role function

-- Licenses table policies
CREATE POLICY "Admins can view all licenses"
ON public.licenses
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update licenses"
ON public.licenses
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Collections policies
CREATE POLICY "Consumers can create collections"
ON public.collections
FOR INSERT
WITH CHECK (
  auth.uid() = consumer_id AND
  public.has_role(auth.uid(), 'consumer'::app_role)
);

-- Reservations policies
CREATE POLICY "Organisations can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (
  auth.uid() = organisation_id AND
  public.has_role(auth.uid(), 'charitable_organisation'::app_role)
);

-- 1.5 Add trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 1.6 Add notification triggers
CREATE OR REPLACE FUNCTION public.notify_license_status_change()
RETURNS TRIGGER
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

CREATE TRIGGER on_license_status_change
  AFTER UPDATE ON public.licenses
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_license_status_change();

-- Notification for new reservations
CREATE OR REPLACE FUNCTION public.notify_new_reservation()
RETURNS TRIGGER
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

CREATE TRIGGER on_new_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_reservation();

-- Notification for collections
CREATE OR REPLACE FUNCTION public.notify_new_collection()
RETURNS TRIGGER
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

CREATE TRIGGER on_new_collection
  AFTER INSERT ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_collection();