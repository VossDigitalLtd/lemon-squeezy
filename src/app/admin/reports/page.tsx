import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isStaffRole } from '@/lib/auth/roles';
import { loadReport } from '@/lib/reportsData';
import { ReportView } from './ReportView';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  // Reports read across all users, so check the viewer is staff on the server too
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Fadmin%2Freports');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!isStaffRole(profile?.role)) redirect('/');

  return <ReportView report={await loadReport()} />;
}
