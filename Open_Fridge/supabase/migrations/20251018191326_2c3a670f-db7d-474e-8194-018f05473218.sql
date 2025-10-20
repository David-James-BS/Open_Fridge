-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to view all user roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Add storage policy for admins to download all licenses
CREATE POLICY "Admins can download all licenses" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'licenses' 
  AND has_role(auth.uid(), 'admin')
);