-- Drop unique constraint to allow multiple license submissions per user (creating history)
ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS licenses_user_id_key;
ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS license_user_id_key;

-- Add index for performance when querying license history
CREATE INDEX IF NOT EXISTS idx_licenses_user_uploaded_at ON public.licenses (user_id, uploaded_at DESC);