'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { AuthHeading, authStyles } from '@/components/auth/AuthShell';
import { FormError } from '@/components/account/AccountUI';
import { usePendingSaveTitle } from '@/hooks/usePendingSaveTitle';
import { friendlyAuthError } from '@/lib/authErrors';
import { features } from '@/lib/config/app';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin';
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingTitle = usePendingSaveTitle();

  useEffect(() => {
    if (!isLoading && user) router.push(next);
  }, [user, isLoading, router, next]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(friendlyAuthError(error.message));
      setSubmitting(false);
      return;
    }

    // Only refresh — the useEffect below watches for user and handles the redirect.
    // Calling router.push(next) here as well causes a double navigation because
    // the useEffect fires simultaneously when the auth state updates.
    router.refresh();
  };

  if (isLoading || user) {
    return (
      <div className="grid h-60 place-items-center text-center" aria-busy="true">
        <div>
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          {user && <p className="mt-4 text-muted-foreground">Signing you in…</p>}
        </div>
      </div>
    );
  }

  const signupHref = next !== '/admin'
    ? `/signup?next=${encodeURIComponent(next)}`
    : '/signup';

  return (
    <>
      <AuthHeading title={pendingTitle ? `Sign in to save ${pendingTitle}` : 'Welcome back'}>
        {pendingTitle
          ? 'It’ll go straight into your recipe box.'
          : 'Sign in to see your recipe box and save new favourites.'}
      </AuthHeading>

      <div className="grid gap-6">
        <OAuthButtons />

        <form className="grid gap-5" onSubmit={handleLogin}>
          {error && <FormError>{error}</FormError>}

          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={authStyles.input}
            />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                Forgotten it?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={authStyles.input}
            />
          </div>

          <button type="submit" className={authStyles.primaryButton} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {features.signup && (
          <p className="rounded-2xl bg-brand-muted px-5 py-4 text-[0.9375rem]">
            New here?{' '}
            <Link href={signupHref} className={authStyles.link}>
              Create a free account
            </Link>{' '}
            to start your own recipe box.
          </p>
        )}
      </div>
    </>
  );
}
