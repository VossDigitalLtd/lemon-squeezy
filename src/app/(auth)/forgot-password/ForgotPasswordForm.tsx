'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { MailCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AuthHeading, authStyles } from '@/components/auth/AuthShell';
import { FormError } from '@/components/account/AccountUI';
import { friendlyAuthError } from '@/lib/authErrors';

export function ForgotPasswordForm() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Already signed in: changing a password lives in the account area
    if (!isLoading && user) router.push('/account/security');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
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
      <div className="grid h-60 place-items-center" aria-busy="true">
        <span className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <MailCheck size={26} />
        </span>
        <AuthHeading title="Check your email">
          <p>
            If there&rsquo;s an account for <strong className="text-foreground">{email}</strong>, we&rsquo;ve sent a link to
            choose a new password.
          </p>
          <p className="mt-3 text-sm">Nothing there after a few minutes? Check your spam folder.</p>
        </AuthHeading>
        <Link href="/login" className={authStyles.link}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Forgotten your password?">
        It happens. Enter your email and we&rsquo;ll send you a link to choose a new one.
      </AuthHeading>

      <form className="grid gap-5" onSubmit={handleSubmit}>
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

        <button type="submit" className={authStyles.primaryButton} disabled={submitting}>
          {submitting ? 'Sending…' : 'Send me a link'}
        </button>

        <p className="text-[0.9375rem] text-muted-foreground">
          Remembered it?{' '}
          <Link href="/login" className={authStyles.link}>
            Back to sign in
          </Link>
        </p>
      </form>
    </>
  );
}
