import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { getAuthPhotos } from '@/lib/authPhotos';
import { ConsentForm } from './ConsentForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Connect an app' };

/**
 * Supabase's OAuth server sends people here (the "Authorization Path" set in
 * the Supabase dashboard) to allow an app such as ChatGPT or Claude to edit recipes.
 */
export default async function ConsentPage() {
  const photos = await getAuthPhotos();
  return (
    <AuthShell photos={photos}>
      <Suspense fallback={<div className="h-60" />}>
        <ConsentForm />
      </Suspense>
    </AuthShell>
  );
}
