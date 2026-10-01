import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';
import { apiError } from '@/lib/api/response';
import { generateCsv } from '@/lib/csv';
import type { NextRequest } from 'next/server';

const COLUMNS = [
  { header: 'Email',      getValue: (r: UserRow) => r.email ?? '' },
  { header: 'Full Name',  getValue: (r: UserRow) => r.full_name ?? '' },
  { header: 'Role',       getValue: (r: UserRow) => r.role },
  { header: 'Joined',     getValue: (r: UserRow) => r.created_at },
  { header: 'Last Login', getValue: (r: UserRow) => r.last_login_at ?? '' },
];

interface UserRow {
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

/** GET /api/admin/users/export — download all users as CSV */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const callerRole = await ProfileService.getRole(supabase);

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return apiError('Forbidden', 403);
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const roleFilter = searchParams.get('role') ?? '';

  const adminClient = createAdminClient();
  let query = adminClient
    .from('profiles')
    .select('email, full_name, role, created_at, last_login_at')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  if (roleFilter && roleFilter !== 'all') {
    query = query.eq('role', roleFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[admin/users/export] error:', error);
    return apiError('Failed to export users', 500);
  }

  const csv = generateCsv(COLUMNS, data ?? []);
  const filename = `users-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
