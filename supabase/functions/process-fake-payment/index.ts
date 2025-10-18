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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { reservationId } = await req.json();

    console.log('Processing fake payment for reservation:', reservationId);

    if (!reservationId) {
      throw new Error('reservationId is required');
    }

    // Verify the reservation belongs to the user
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('organisation_id', user.id)
      .single();

    if (reservationError || !reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.deposit_status === 'paid') {
      throw new Error('Payment already processed');
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update reservation deposit status
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        deposit_status: 'paid',
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('Error updating reservation:', updateError);
      throw updateError;
    }

    console.log('Fake payment processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        reservationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-fake-payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
