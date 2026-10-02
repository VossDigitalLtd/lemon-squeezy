import { AuthShell } from '@/components/auth/AuthShell';
import { getAuthPhotos } from '@/lib/authPhotos';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reset your password' };

export default async function ForgotPasswordPage() {
  const photos = await getAuthPhotos();
  return (
    <AuthShell photos={photos}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
