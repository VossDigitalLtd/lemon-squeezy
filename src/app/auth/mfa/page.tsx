'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/ui/AppLogo';

function MfaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Guard: if user is not logged in or already at aal2, redirect immediately
  useEffect(() => {
    async function guard() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aal || aal.currentLevel === aal.nextLevel) {
        // MFA not required or already satisfied
        router.replace(next);
        return;
      }
      setChecking(false);
    }
    guard();
  }, [router, next]);

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setError(null);
    setSubmitting(true);

    const supabase = createClient();

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp[0];

    if (factorsError || !totpFactor) {
      setError('No authenticator found. Please re-enable 2FA on your profile.');
      setSubmitting(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id,
    });

    if (challengeError || !challenge) {
      setError(challengeError?.message ?? 'Failed to create challenge. Please try again.');
      setSubmitting(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError('Invalid code. Please check your authenticator app and try again.');
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <AppLogo height={40} className="font-bold text-xl text-foreground" />
          </div>
          <div className="mx-auto h-12 w-12 rounded-full bg-brand-muted flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Two-factor authentication
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="mfa-code" className="block text-sm font-medium text-foreground">
              Verification code
            </label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000 000"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              className="text-center text-xl tracking-[0.4em] font-mono"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
            {submitting ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MfaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <MfaForm />
    </Suspense>
  );
}
