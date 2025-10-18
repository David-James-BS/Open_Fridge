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

    // Check if user is a vendor
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'vendor')
      .single();

    if (roleError || !userRoles) {
      throw new Error('Only vendors can generate QR codes');
    }

    console.log('Generating QR code for vendor:', user.id);

    // Check if QR code already exists for this vendor
    const { data: existingQR } = await supabase
      .from('vendor_qr_codes')
      .select('*')
      .eq('vendor_id', user.id)
      .maybeSingle();

    if (existingQR) {
      console.log('QR code already exists for vendor:', user.id);
      return new Response(
        JSON.stringify({ qr_code: existingQR.qr_code }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique QR code (just use vendor ID)
    const qrCode = user.id;

    // Insert QR code into database
    const { data, error } = await supabase
      .from('vendor_qr_codes')
      .insert({
        vendor_id: user.id,
        qr_code: qrCode,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting QR code:', error);
      throw error;
    }

    console.log('QR code generated successfully:', data);

    return new Response(
      JSON.stringify({ qr_code: data.qr_code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-vendor-qr:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
