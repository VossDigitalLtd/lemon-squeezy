import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { getAuthPhotos } from '@/lib/authPhotos';
import { LoginForm } from './LoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const photos = await getAuthPhotos();
  return (
    <AuthShell photos={photos}>
      <Suspense fallback={<div className="h-60" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
