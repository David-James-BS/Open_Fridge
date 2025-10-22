import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    // Create client for user authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Create admin client for bypassing RLS on updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { qrCode, portionsToCollect, reservationId } = await req.json();

    // For consumers, validate portions
    // For organizations, portionsToCollect is not used (use reservation data instead)
    if (portionsToCollect !== undefined && (portionsToCollect < 1 || portionsToCollect > 5)) {
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
      // Check daily limit (5 portions per consumer per day)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: todayCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('portions_collected')
        .eq('consumer_id', user.id)
        .gte('collected_at', todayStart.toISOString());

      if (collectionsError) {
        console.error('Error checking daily collections:', collectionsError);
        throw new Error('Failed to check daily limit');
      }

      const totalCollectedToday = (todayCollections || []).reduce(
        (sum, col) => sum + col.portions_collected, 
        0
      );

      if (totalCollectedToday + portionsToCollect > 5) {
        throw new Error('Limit reached — you can select a maximum of 5 food items per day');
      }

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

      // Update remaining portions using admin client to bypass RLS
      const { error: updateError } = await supabaseAdmin
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
      // Mark reservation as collected and decrease remaining_portions
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

      // Check if enough portions available
      if (activeListing.remaining_portions < reservation.portions_reserved) {
        throw new Error('Not enough portions available');
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

      // Decrease remaining_portions NOW (when actually collected)
      const { error: updatePortionsError } = await supabaseAdmin
        .from('food_listings')
        .update({
          remaining_portions: activeListing.remaining_portions - reservation.portions_reserved,
        })
        .eq('id', activeListing.id);

      if (updatePortionsError) {
        console.error('Error updating portions:', updatePortionsError);
        throw updatePortionsError;
      }

      console.log('Reservation collected successfully, portions decreased');

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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
