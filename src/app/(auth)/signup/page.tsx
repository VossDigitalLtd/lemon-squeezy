import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { getAuthPhotos } from '@/lib/authPhotos';
import { SignupForm } from './SignupForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create an account' };

export default async function SignupPage() {
  const photos = await getAuthPhotos();
  return (
    <AuthShell photos={photos}>
      <Suspense fallback={<div className="h-60" />}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
