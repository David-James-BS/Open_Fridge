-- Add DELETE RLS policies for user self-deletion

-- Profiles: Users can delete own profile
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- User roles: Users can delete own roles
CREATE POLICY "Users can delete own roles"
ON public.user_roles
FOR DELETE
USING (auth.uid() = user_id);

-- Food listings: Vendors can delete own listings
CREATE POLICY "Vendors can delete own listings"
ON public.food_listings
FOR DELETE
USING (auth.uid() = vendor_id);

-- Reservations: Organisations can delete own reservations
CREATE POLICY "Organisations can delete own reservations"
ON public.reservations
FOR DELETE
USING (auth.uid() = organisation_id);

-- Collections: Consumers can delete own collections
CREATE POLICY "Consumers can delete own collections"
ON public.collections
FOR DELETE
USING (auth.uid() = consumer_id);

-- Licenses: Users can delete own licenses
CREATE POLICY "Users can delete own licenses"
ON public.licenses
FOR DELETE
USING (auth.uid() = user_id);

-- Vendor QR codes: Vendors can delete own QR codes
CREATE POLICY "Vendors can delete own QR codes"
ON public.vendor_qr_codes
FOR DELETE
USING (auth.uid() = vendor_id);

-- Notifications: Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);