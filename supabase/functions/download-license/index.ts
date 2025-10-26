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

    const { licenseId } = await req.json();

    console.log('Admin downloading license:', { licenseId, adminId: user.id });

    if (!licenseId) {
      throw new Error('licenseId is required');
    }

    // Get license file URL
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('file_url, user_id')
      .eq('id', licenseId)
      .single();

    if (licenseError || !license) {
      console.error('Error fetching license:', licenseError);
      throw new Error('License not found');
    }

    // Extract file path from URL
    const urlParts = license.file_url.split('/');
    const filePath = `${license.user_id}/${urlParts[urlParts.length - 1]}`;

    console.log('Downloading file from path:', filePath);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('licenses')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      throw new Error('Failed to download license file');
    }

    console.log('Creating signed URL for license file');

    // Generate a signed URL valid for 1 minute
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('licenses')
      .createSignedUrl(filePath, 60);

    if (signedUrlError || !signedUrlData) {
      console.error('Error creating signed URL:', signedUrlError);
      throw new Error('Failed to create download link');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        signedUrl: signedUrlData.signedUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in download-license:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
