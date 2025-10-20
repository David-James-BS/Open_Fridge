import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking for expired listings...');

    // Update all active listings where best_before has passed
    const { data: expiredListings, error } = await supabase
      .from('food_listings')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('best_before', new Date().toISOString())
      .select();

    if (error) {
      console.error('Error updating expired listings:', error);
      throw error;
    }

    console.log(`Updated ${expiredListings?.length || 0} expired listings`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: expiredListings?.length || 0,
        listings: expiredListings 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-expired-listings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});