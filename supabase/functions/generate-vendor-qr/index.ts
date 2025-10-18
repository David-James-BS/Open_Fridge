import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { vendorId } = await req.json();

    if (!vendorId) {
      throw new Error('vendorId is required');
    }

    console.log('Generating QR code for vendor:', vendorId);

    // Generate a unique QR code (using vendor ID as the QR code value)
    const qrCode = `VENDOR-${vendorId}-${Date.now()}`;

    // Check if QR code already exists for this vendor
    const { data: existingQR } = await supabase
      .from('vendor_qr_codes')
      .select('*')
      .eq('vendor_id', vendorId)
      .single();

    if (existingQR) {
      console.log('QR code already exists for vendor:', vendorId);
      return new Response(
        JSON.stringify({ qrCode: existingQR.qr_code }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert QR code into database
    const { data, error } = await supabase
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
