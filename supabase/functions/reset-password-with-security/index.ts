import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Simple hash function using Web Crypto API
async function hashAnswer(answer: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(answer.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, securityAnswer1, securityAnswer2, newPassword } = await req.json();

    if (!email || !securityAnswer1 || !securityAnswer2 || !newPassword) {
      throw new Error('Missing required fields');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user profile with security questions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, security_answer_1_hash, security_answer_2_hash')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('User not found');
    }

    if (!profile.security_answer_1_hash || !profile.security_answer_2_hash) {
      throw new Error('Security questions not set for this account');
    }

    // Hash the provided answers and verify
    const answer1Hash = await hashAnswer(securityAnswer1);
    const answer2Hash = await hashAnswer(securityAnswer2);

    if (profile.security_answer_1_hash !== answer1Hash || 
        profile.security_answer_2_hash !== answer2Hash) {
      throw new Error('Incorrect security answers');
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      throw new Error('Failed to update password');
    }

    console.log('Password reset successful for user:', profile.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reset-password-with-security:', error);
    const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
