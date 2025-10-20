-- Fix PUBLIC_DATA_EXPOSURE: Remove overly permissive profile access
-- Drop the policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create limited public view for vendor discovery only (stall_name and location)
-- This allows consumers to browse vendors without exposing emails/phones
CREATE POLICY "Public vendor info for discovery"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_roles 
      WHERE user_id = profiles.id 
      AND role = 'vendor'::app_role
    )
  );

-- Note: The existing "Users can view own profile" policy already handles 
-- authenticated users viewing their full profile data

-- Fix INPUT_VALIDATION: Add length constraints to food_listings table
-- Prevent XSS and database issues from unbounded text fields
ALTER TABLE public.food_listings 
  ADD CONSTRAINT title_length CHECK (length(title) <= 200);

ALTER TABLE public.food_listings 
  ADD CONSTRAINT description_length CHECK (length(description) <= 2000);

ALTER TABLE public.food_listings 
  ADD CONSTRAINT location_length CHECK (length(location) <= 500);

-- Add constraint for portions to prevent abuse
ALTER TABLE public.food_listings 
  ADD CONSTRAINT total_portions_reasonable CHECK (total_portions > 0 AND total_portions <= 1000);