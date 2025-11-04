-- Update profiles table to support 2 security questions with hashed answers
-- Remove old single security question columns if they exist
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS security_question,
  DROP COLUMN IF EXISTS security_answer;

-- Add new columns for 2 security questions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_question_1 TEXT,
  ADD COLUMN IF NOT EXISTS security_answer_1_hash TEXT,
  ADD COLUMN IF NOT EXISTS security_question_2 TEXT,
  ADD COLUMN IF NOT EXISTS security_answer_2_hash TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.security_answer_1_hash IS 'Hashed answer to security question 1 for password recovery';
COMMENT ON COLUMN public.profiles.security_answer_2_hash IS 'Hashed answer to security question 2 for password recovery';