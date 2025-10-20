-- Add vendor profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stall_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Update the handle_new_user trigger to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, stall_name, phone, location)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'stall_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'location'
  );
  RETURN NEW;
END;
$function$;

-- Allow everyone to view vendor profiles
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);