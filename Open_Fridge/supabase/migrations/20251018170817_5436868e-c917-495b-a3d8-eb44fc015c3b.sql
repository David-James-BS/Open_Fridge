-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('consumer', 'vendor', 'charitable_organisation', 'admin');

-- Create enum for license status
CREATE TYPE license_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for listing status
CREATE TYPE listing_status AS ENUM ('active', 'expired', 'completed');

-- Create enum for dietary requirements
CREATE TYPE dietary_type AS ENUM ('vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'dairy_free', 'nut_free', 'none');

-- Create enum for cuisines
CREATE TYPE cuisine_type AS ENUM ('chinese', 'malay', 'indian', 'western', 'japanese', 'korean', 'thai', 'vietnamese', 'italian', 'mexican', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create licenses table
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  status license_status NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  UNIQUE(user_id)
);

-- Create vendor QR codes table (persistent QR per vendor)
CREATE TABLE public.vendor_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  qr_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create food listings table
CREATE TABLE public.food_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cuisine cuisine_type NOT NULL,
  dietary_info dietary_type[] NOT NULL DEFAULT '{}',
  total_portions INTEGER NOT NULL CHECK (total_portions > 0),
  remaining_portions INTEGER NOT NULL CHECK (remaining_portions >= 0),
  location TEXT NOT NULL,
  best_before TIMESTAMPTZ NOT NULL,
  status listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portions_reserved INTEGER NOT NULL CHECK (portions_reserved > 0),
  deposit_amount DECIMAL(10,2) NOT NULL CHECK (deposit_amount > 0),
  deposit_status TEXT NOT NULL DEFAULT 'pending' CHECK (deposit_status IN ('pending', 'paid', 'forfeited', 'refunded')),
  collected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_at TIMESTAMPTZ
);

-- Create collections table (for consumer pickups)
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portions_collected INTEGER NOT NULL CHECK (portions_collected > 0 AND portions_collected <= 5),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for licenses
CREATE POLICY "Users can view own license" ON public.licenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own license" ON public.licenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all licenses" ON public.licenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update licenses" ON public.licenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for vendor_qr_codes
CREATE POLICY "Vendors can view own QR" ON public.vendor_qr_codes
  FOR SELECT USING (auth.uid() = vendor_id);

CREATE POLICY "Anyone can view vendor QR for scanning" ON public.vendor_qr_codes
  FOR SELECT USING (true);

-- RLS Policies for food_listings
CREATE POLICY "Anyone can view active listings" ON public.food_listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "Vendors can insert own listings" ON public.food_listings
  FOR INSERT WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update own listings" ON public.food_listings
  FOR UPDATE USING (auth.uid() = vendor_id);

-- RLS Policies for reservations
CREATE POLICY "Users can view own reservations" ON public.reservations
  FOR SELECT USING (
    auth.uid() = organisation_id OR 
    auth.uid() IN (SELECT vendor_id FROM public.food_listings WHERE id = listing_id)
  );

CREATE POLICY "Organisations can create reservations" ON public.reservations
  FOR INSERT WITH CHECK (
    auth.uid() = organisation_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'charitable_organisation')
  );

CREATE POLICY "Organisations can update own reservations" ON public.reservations
  FOR UPDATE USING (auth.uid() = organisation_id);

-- RLS Policies for collections
CREATE POLICY "Users can view own collections" ON public.collections
  FOR SELECT USING (
    auth.uid() = consumer_id OR 
    auth.uid() IN (SELECT vendor_id FROM public.food_listings WHERE id = listing_id)
  );

CREATE POLICY "Consumers can create collections" ON public.collections
  FOR INSERT WITH CHECK (
    auth.uid() = consumer_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'consumer')
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for food_listings
CREATE TRIGGER update_food_listings_updated_at
  BEFORE UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check vendor has only one active listing
CREATE OR REPLACE FUNCTION check_vendor_active_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.food_listings 
    WHERE vendor_id = NEW.vendor_id 
    AND status = 'active' 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Vendor can only have one active listing at a time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce one active listing per vendor
CREATE TRIGGER enforce_one_active_listing
  BEFORE INSERT OR UPDATE ON public.food_listings
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION check_vendor_active_listing();

-- Function to validate best_before time is in future
CREATE OR REPLACE FUNCTION validate_best_before()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.best_before <= NOW() THEN
    RAISE EXCEPTION 'Best before time must be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate best_before
CREATE TRIGGER validate_best_before_trigger
  BEFORE INSERT OR UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION validate_best_before();

-- Function to auto-complete listing when portions reach 0
CREATE OR REPLACE FUNCTION auto_complete_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.remaining_portions = 0 AND OLD.remaining_portions > 0 THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete listing
CREATE TRIGGER auto_complete_listing_trigger
  BEFORE UPDATE ON public.food_listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_listing();

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.licenses;