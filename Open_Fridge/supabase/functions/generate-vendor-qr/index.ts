import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const requestBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const vendorIdFromRequest = requestBody.vendorId;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let vendorId: string;

    // If vendorId is provided (from approve-license edge function), use it directly
    if (vendorIdFromRequest) {
      vendorId = vendorIdFromRequest;
      console.log('Generating QR code for vendor from service:', vendorId);
    } else {
      // Otherwise, get from auth header (user is calling this themselves)
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
      const { data: userRoles, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'vendor')
        .single();

      if (roleError || !userRoles) {
        throw new Error('Only vendors can generate QR codes');
      }

      vendorId = user.id;
      console.log('Generating QR code for vendor:', vendorId);
    }

    // Check if QR code already exists for this vendor
    const { data: existingQR } = await supabaseAdmin
      .from('vendor_qr_codes')
      .select('*')
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (existingQR) {
      console.log('QR code already exists for vendor:', vendorId);
      return new Response(
        JSON.stringify({ qrCode: existingQR.qr_code }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique QR code (just use vendor ID)
    const qrCode = vendorId;

    // Insert QR code into database using admin client
    const { data, error } = await supabaseAdmin
      .from('vendor_qr_codes')
      .insert({
        vendor_id: vendorId,
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
      JSON.stringify({ qrCode: data.qr_code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-vendor-qr:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
