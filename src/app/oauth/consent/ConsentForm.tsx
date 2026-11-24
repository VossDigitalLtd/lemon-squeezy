'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { isStaffRole } from '@/lib/auth/roles';
import type { OAuthAuthorizationDetails } from '@supabase/supabase-js';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'not-staff'; details: OAuthAuthorizationDetails }
  | { kind: 'ask'; details: OAuthAuthorizationDetails };

const CAN_DO = [
  'Search and read recipes, including drafts and archived ones',
  'Change recipes: ingredients, method, times, descriptions, categories',
  'Add new recipes (as drafts)',
  'Publish, unpublish and archive recipes',
  'Move recipes to the Trash',
];

export function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get('authorization_id');
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authorizationId) {
      setState({ kind: 'error', message: 'This link is missing its request. Start connecting again from the app.' });
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        // Sign in first, then come back here
        router.replace(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
        return;
      }

      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (error || !data) {
        setState({ kind: 'error', message: 'This request has expired or was already used. Start connecting again from the app.' });
        return;
      }
      // Already allowed before: carry straight on
      if (!('authorization_id' in data)) {
        window.location.href = data.redirect_url;
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
      setState({ kind: isStaffRole(profile?.role) ? 'ask' : 'not-staff', details: data });
    })();
  }, [authorizationId, router]);

  async function decide(allow: boolean) {
    if (!authorizationId) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = allow
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (error || !data) {
      setBusy(false);
      setState({ kind: 'error', message: 'That didn’t work. Start connecting again from the app.' });
      return;
    }
    window.location.href = data.redirect_url;
  }

  if (state.kind === 'loading') {
    return <p className="text-muted-foreground">Checking the request…</p>;
  }

  if (state.kind === 'error') {
    return (
      <div>
        <h1 className="font-display text-3xl">Can’t connect</h1>
        <p className="mt-3 text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  const { details } = state;
  const appName = details.client.name || 'An app';

  if (state.kind === 'not-staff') {
    return (
      <div>
        <h1 className="font-display text-3xl">Editors only</h1>
        <p className="mt-3 text-muted-foreground">
          {appName} wants to edit Lemon Squeezy recipes, which only editors and admins can do. You’re signed in as{' '}
          <strong className="text-foreground">{details.user.email}</strong>.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => decide(false)} disabled={busy}>
          Go back to {appName}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Connect {appName}?</h1>
      <p className="mt-3 text-muted-foreground">
        {appName} wants to work on Lemon Squeezy recipes as <strong className="text-foreground">{details.user.email}</strong>. It will be
        able to:
      </p>
      <ul className="mt-4 space-y-2">
        {CAN_DO.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Check size={16} className="mt-0.5 flex-shrink-0 text-viz-good" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Changes to published recipes go live straight away. Each recipe’s History in the admin keeps the previous versions, and the
        Trash keeps deleted recipes for 30 days, so changes can be undone. It can’t change photos or empty the Trash.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => decide(true)} disabled={busy}>
          {busy ? 'Connecting…' : `Allow ${appName}`}
        </Button>
        <Button variant="outline" onClick={() => decide(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
