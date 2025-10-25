-- Allow users to update their rejected licenses
CREATE POLICY "Users can update own rejected license"
ON public.licenses
FOR UPDATE
USING (
  auth.uid() = user_id AND 
  status = 'rejected'
);