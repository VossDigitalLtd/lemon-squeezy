// lib/supabase/middleware.ts
// Middleware client for Supabase - use in Next.js middleware for session refresh
import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

/**
 * Updates the Supabase session in middleware
 * This refreshes the auth token and keeps the session alive
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Block /signup when public sign-up is disabled
  const signupEnabled = process.env.NEXT_PUBLIC_FEATURE_SIGNUP === 'true';
  if (!signupEnabled && request.nextUrl.pathname.startsWith('/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAccountRoute = request.nextUrl.pathname.startsWith('/account');
  // BOLT-ON: account — opt-in via NEXT_PUBLIC_FEATURE_ACCOUNT=true
  const accountEnabled = process.env.NEXT_PUBLIC_FEATURE_ACCOUNT === 'true';

  // BOLT-ON: account — protect /account/* routes; redirect unauthenticated to login
  if (!user && isAccountRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (!user && isAdminRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const onboardingEnabled = process.env.NEXT_PUBLIC_FEATURE_ONBOARDING === 'true';
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/admin/onboarding');

  // Block direct access to /admin/onboarding when the feature is disabled
  if (isOnboardingRoute && !onboardingEnabled) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Block direct access to /admin/billing when the billing feature is disabled
  const billingEnabled = process.env.NEXT_PUBLIC_FEATURE_BILLING === 'true';
  if (request.nextUrl.pathname.startsWith('/admin/billing') && !billingEnabled) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Block direct access to bolt-on admin routes when their feature is disabled
  const boltOnRoutes: Array<{ prefix: string; enabled: boolean }> = [
    { prefix: '/admin/audit',     enabled: process.env.NEXT_PUBLIC_FEATURE_AUDIT_LOG   === 'true' },
    { prefix: '/admin/media',     enabled: process.env.NEXT_PUBLIC_FEATURE_MEDIA       === 'true' },
    { prefix: '/admin/support',   enabled: process.env.NEXT_PUBLIC_FEATURE_SUPPORT     === 'true' },
    { prefix: '/admin/workspace', enabled: process.env.NEXT_PUBLIC_FEATURE_WORKSPACES  === 'true' },
    // developer is opt-out (default enabled) — block only when explicitly set to 'false'
    { prefix: '/admin/developer', enabled: process.env.NEXT_PUBLIC_FEATURE_DEVELOPER   !== 'false' },
  ];
  for (const { prefix, enabled } of boltOnRoutes) {
    if (request.nextUrl.pathname.startsWith(prefix) && !enabled) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  if (user && isAdminRoute) {
    // Single profile query covers both role-gating and onboarding checks.
    //
    // Role block: role='user' is the end-customer tier and must never access the
    // admin area, regardless of whether this is a public-facing or private app.
    // Editors, admins, and super_admins are the only roles permitted here.
    // BOLT-ON: account — if enabled, role='user' lands at /account; otherwise falls
    // back to NEXT_PUBLIC_HOME_REDIRECT or '/'.
    //
    // BOLT-ON: onboarding — remove the onboarding_completed check below if you
    // are not using the onboarding feature.
    const selectFields = onboardingEnabled ? 'role, onboarding_completed' : 'role';
    const { data: profile } = await supabase
      .from('profiles')
      .select(selectFields)
      .eq('id', user.id)
      .single();

    const profileData = profile as { role?: string; onboarding_completed?: boolean } | null;

    if (profileData?.role === 'user') {
      const url = request.nextUrl.clone();
      url.pathname = process.env.NEXT_PUBLIC_HOME_REDIRECT ?? (accountEnabled ? '/account' : '/');
      return NextResponse.redirect(url);
    }

    if (onboardingEnabled && !isOnboardingRoute && profileData?.onboarding_completed === false) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // MFA enforcement: if the user has a verified TOTP factor (nextLevel === 'aal2')
  // but the current session hasn't completed the challenge yet, redirect to the
  // MFA verification page.
  if (user && isAdminRoute) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      const url = request.nextUrl.clone();
      const next = request.nextUrl.pathname + request.nextUrl.search;
      url.pathname = '/auth/mfa';
      url.searchParams.set('next', next);
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
