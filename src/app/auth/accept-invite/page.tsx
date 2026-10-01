// BOLT-ON: workspaces — safe to delete if not using workspaces/organisations
'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth';
import { AppLogo } from '@/components/ui/AppLogo';
import { Button } from '@/components/ui/button';

type Status = 'loading' | 'accepting' | 'success' | 'error';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, isLoading } = useAuth();

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    // Wait until auth state is known
    if (isLoading) return;

    if (!token) {
      setStatus('error');
      setErrorMessage('No invite token found in the link. Please check your invitation email.');
      return;
    }

    if (!user) {
      // Not logged in — send to login, come back here after
      const next = encodeURIComponent(`/auth/accept-invite?token=${token}`);
      router.replace(`/login?next=${next}`);
      return;
    }

    // Prevent running twice in React Strict Mode / re-renders
    if (hasRun.current) return;
    hasRun.current = true;

    setStatus('accepting');

    fetch('/api/workspaces/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json().then((json) => ({ res, json })))
      .then(({ res, json }) => {
        if (!res.ok) {
          setStatus('error');
          setErrorMessage(json.error ?? 'Failed to accept the invitation. It may have expired or already been used.');
          return;
        }
        setStatus('success');
        setTimeout(() => {
          router.replace(`/admin/workspace/${json.data.workspaceId}`);
        }, 1500);
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      });
  }, [token, router, user, isLoading]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-8">
          <AppLogo height={32} />
        </div>

        {status === 'loading' || status === 'accepting' ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {status === 'loading' ? 'Checking your invitation...' : 'Joining workspace...'}
            </p>
          </div>
        ) : status === 'success' ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">You&apos;ve joined the workspace!</p>
              <p className="text-sm text-muted-foreground mt-1">Redirecting you now...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">Invitation error</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin">Go to dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
