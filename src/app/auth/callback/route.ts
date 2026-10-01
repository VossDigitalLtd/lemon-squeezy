import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/admin';

  const supabase = await createClient();

  // PKCE flow — OAuth logins and email confirmations
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // OTP flow — magic links and password resets via email link
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Implicit flow — tokens in URL hash fragment (used by Supabase user invite emails)
  // Route Handlers cannot read hash fragments; return an HTML bridge that lets
  // client-side JS forward them to /auth/session where setSession() is called.
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Signing in…</title></head>
<body><script>
(function(){
  var hash = window.location.hash;
  var next = ${JSON.stringify(next)};
  if (hash && hash.indexOf('access_token') !== -1) {
    window.location.replace('/auth/session?next=' + encodeURIComponent(next) + hash);
  } else {
    window.location.replace('/auth/error');
  }
})();
</script></body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
