-- Allow users to update their own licenses (especially when rejected and retrying)
CREATE POLICY "Users can update own license"
ON public.licenses
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);