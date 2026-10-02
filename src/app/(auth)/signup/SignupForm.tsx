'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, MailCheck } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { AuthHeading, authStyles } from '@/components/auth/AuthShell';
import { FormError } from '@/components/account/AccountUI';
import { usePendingSaveTitle } from '@/hooks/usePendingSaveTitle';
import { friendlyAuthError } from '@/lib/authErrors';
import { PASSWORD_RULES, validatePassword } from '@/lib/utils/password';
import { cn } from '@/utils/cn';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // New accounts are home cooks, so default back to the site rather than /admin
  const next = searchParams.get('next') ?? '/';
  const { user, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const pendingTitle = usePendingSaveTitle();

  useEffect(() => {
    if (!isLoading && user) router.push(next);
  }, [user, isLoading, router, next]);

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // Picked up by the profiles trigger, so the account can greet people by name
        ...(fullName.trim() ? { data: { full_name: fullName.trim() } } : {}),
      },
    });

    if (error) {
      setError(friendlyAuthError(error.message));
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  };

  if (isLoading || user) {
    return (
      <div className="grid h-60 place-items-center text-center" aria-busy="true">
        <div>
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          {user && <p className="mt-4 text-muted-foreground">Taking you back…</p>}
        </div>
      </div>
    );
  }

  const loginHref = next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login?next=%2F';

  if (success) {
    return (
      <div>
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <MailCheck size={26} />
        </span>
        <AuthHeading title="Check your email">
          <p>
            We&rsquo;ve sent a link to <strong className="text-foreground">{email}</strong>. Open it on this device to
            confirm your account{pendingTitle ? <> and we&rsquo;ll save <strong className="text-foreground">{pendingTitle}</strong> to your recipe box</> : null}.
          </p>
          <p className="mt-3 text-sm">Nothing there after a few minutes? Check your spam folder.</p>
        </AuthHeading>
        <Link href={loginHref} className={authStyles.link}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title={pendingTitle ? `Create an account to save ${pendingTitle}` : 'Start your recipe box'}>
        {pendingTitle
          ? 'It’s free, and your saved recipes are ready on any device.'
          : 'A free account lets you save the recipes you love and find them on any device.'}
      </AuthHeading>

      <div className="grid gap-6">
        <OAuthButtons />

        <form className="grid gap-5" onSubmit={handleSignup}>
          {error && <FormError>{error}</FormError>}

          <div className="grid gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium">
              Your name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="So we can say hello"
              className={authStyles.input}
            />
          </div>
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
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={authStyles.input}
              aria-describedby="password-rules"
            />
            <ul id="password-rules" className="mt-1 grid gap-1">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <li
                    key={rule.id}
                    className={cn(
                      'flex items-center gap-1.5 text-[0.8125rem]',
                      met ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                    )}
                  >
                    <Check size={13} className={met ? 'opacity-100' : 'opacity-30'} />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <button type="submit" className={authStyles.primaryButton} disabled={submitting}>
            {submitting ? 'Creating your account…' : 'Create account'}
          </button>
        </form>

        <p className="text-[0.9375rem] text-muted-foreground">
          Already have an account?{' '}
          <Link href={loginHref} className={authStyles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
