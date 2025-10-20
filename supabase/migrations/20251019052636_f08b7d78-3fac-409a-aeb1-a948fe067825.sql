-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions to use pg_net
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Schedule the edge function to run every minute to check for expired listings
SELECT cron.schedule(
  'check-expired-listings',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://ezezqluumipccctwgtgl.supabase.co/functions/v1/check-expired-listings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZXpxbHV1bWlwY2NjdHdndGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzM5OTYsImV4cCI6MjA3NjM0OTk5Nn0.3s5DqcB0iZFe86Up7Aj4xYsFZSMNLdU7aEPEy-Jt4tM"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);