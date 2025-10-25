-- Add security question columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN security_question TEXT,
ADD COLUMN security_answer TEXT;

COMMENT ON COLUMN public.profiles.security_question IS 'Security question chosen by user for password recovery';
COMMENT ON COLUMN public.profiles.security_answer IS 'Answer to security question (should be stored in lowercase for comparison)';