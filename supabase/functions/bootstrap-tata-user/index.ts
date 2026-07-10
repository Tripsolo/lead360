import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const email = 'tech@raisn.ai';
  const password = 'RaisnRocks@1';

  // Find or create user
  const { data: list } = await supabase.auth.admin.listUsers();
  let user = list?.users?.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    user = data.user;
  } else {
    // reset password to ensure it matches
    await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }

  // Grant tata-aia brand access
  const { error: upErr } = await supabase
    .from('user_brand_access')
    .upsert({ user_id: user!.id, brand_id: 'tata-aia' }, { onConflict: 'user_id,brand_id' });

  return new Response(JSON.stringify({ ok: true, user_id: user!.id, upsertError: upErr?.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
