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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify admin user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      throw new Error('User is not an admin');
    }

    const { licenseId, status, rejectionReason } = await req.json();

    console.log('Approving/rejecting license:', { licenseId, status, adminId: user.id });

    if (!licenseId || !status) {
      throw new Error('licenseId and status are required');
    }

    if (status !== 'approved' && status !== 'rejected') {
      throw new Error('status must be either "approved" or "rejected"');
    }

    if (status === 'rejected' && !rejectionReason) {
      throw new Error('rejectionReason is required when rejecting a license');
    }

    // Update license
    const { data: license, error: updateError } = await supabase
      .from('licenses')
      .update({
        status,
        rejection_reason: rejectionReason || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', licenseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating license:', updateError);
      throw updateError;
    }

    console.log('License updated successfully:', license);

    // If approved and user is a vendor, generate QR code
    if (status === 'approved') {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', license.user_id)
        .eq('role', 'vendor')
        .single();

      if (userRole) {
        console.log('Generating QR code for vendor:', license.user_id);
        
        // Call generate-vendor-qr function
        const qrResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-vendor-qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ vendorId: license.user_id }),
        });

        if (!qrResponse.ok) {
          console.error('Failed to generate QR code:', await qrResponse.text());
        } else {
          console.log('QR code generated successfully');
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, license }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in approve-license:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
