-- Update listing_status enum to include cancelled
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'cancelled';