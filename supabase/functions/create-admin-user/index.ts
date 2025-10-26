import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, securityQuestion1, securityAnswer1Hash, securityQuestion2, securityAnswer2Hash } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if we already have 5 admin accounts
    const { data: existingAdmins, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('id', { count: 'exact' })
      .eq('role', 'admin');

    if (countError) {
      throw countError;
    }

    if (existingAdmins && existingAdmins.length >= 5) {
      return new Response(
        JSON.stringify({ error: 'Cannot create admin account. Maximum of 5 admin accounts allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin'
      });

    if (roleError) {
      // Cleanup: delete the user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    // Update profile with security questions if provided
    if (securityQuestion1 && securityAnswer1Hash && securityQuestion2 && securityAnswer2Hash) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          security_question_1: securityQuestion1,
          security_answer_1_hash: securityAnswer1Hash,
          security_question_2: securityQuestion2,
          security_answer_2_hash: securityAnswer2Hash
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Error updating profile with security questions:', profileError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        userId: authData.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating admin user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
