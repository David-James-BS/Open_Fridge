import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { qrCode, portionsToCollect, reservationId } = await req.json();

    if (!portionsToCollect || portionsToCollect < 1 || portionsToCollect > 5) {
      throw new Error('Portions must be between 1 and 5');
    }

    console.log('Validating QR scan:', { qrCode, userId: user.id, portionsToCollect, reservationId });

    // Get vendor from QR code
    const { data: vendorQR, error: qrError } = await supabase
      .from('vendor_qr_codes')
      .select('vendor_id')
      .eq('qr_code', qrCode)
      .single();

    if (qrError || !vendorQR) {
      console.error('Invalid QR code:', qrError);
      throw new Error('Invalid QR code');
    }

    // Check if vendor has an active listing
    const { data: activeListing, error: listingError } = await supabase
      .from('food_listings')
      .select('*')
      .eq('vendor_id', vendorQR.vendor_id)
      .eq('status', 'active')
      .single();

    if (listingError || !activeListing) {
      console.error('No active listing found:', listingError);
      throw new Error('Vendor has no active food listing');
    }

    // Check user role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      throw new Error('User role not found');
    }

    const role = userRoles[0].role;

    // Handle based on user role
    if (role === 'consumer') {
      // Create collection
      if (activeListing.remaining_portions < portionsToCollect) {
        throw new Error('Not enough portions available');
      }

      const { error: collectionError } = await supabase
        .from('collections')
        .insert({
          consumer_id: user.id,
          listing_id: activeListing.id,
          portions_collected: portionsToCollect,
        });

      if (collectionError) {
        console.error('Error creating collection:', collectionError);
        throw collectionError;
      }

      // Update remaining portions
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({
          remaining_portions: activeListing.remaining_portions - portionsToCollect,
        })
        .eq('id', activeListing.id);

      if (updateError) {
        console.error('Error updating portions:', updateError);
        throw updateError;
      }

      console.log('Collection created successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Food collected successfully!',
          listing: activeListing,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (role === 'charitable_organisation') {
      // Mark reservation as collected
      if (!reservationId) {
        throw new Error('Reservation ID is required for organizations');
      }

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .eq('organisation_id', user.id)
        .eq('listing_id', activeListing.id)
        .single();

      if (reservationError || !reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.collected) {
        throw new Error('Reservation already collected');
      }

      if (reservation.deposit_status !== 'paid') {
        throw new Error('Deposit must be paid before collection');
      }

      // Mark as collected
      const { error: updateReservationError } = await supabase
        .from('reservations')
        .update({
          collected: true,
          collected_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (updateReservationError) {
        console.error('Error updating reservation:', updateReservationError);
        throw updateReservationError;
      }

      console.log('Reservation collected successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Food collected successfully!',
          listing: activeListing,
          reservation,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Invalid user role for collection');
    }
  } catch (error) {
    console.error('Error in validate-qr-scan:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
