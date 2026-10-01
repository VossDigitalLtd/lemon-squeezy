import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';

export default async function UsersLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const role = await ProfileService.getRole(supabase);

  if (role !== 'admin' && role !== 'super_admin') {
    redirect('/admin');
  }

  return <>{children}</>;
}
