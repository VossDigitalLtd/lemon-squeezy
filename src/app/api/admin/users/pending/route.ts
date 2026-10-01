import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

/** GET /api/admin/users/pending — list users who have been invited but not yet confirmed */
export async function GET() {
  const supabase = await createClient();
  const callerRole = await ProfileService.getRole(supabase);

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return apiError('Forbidden', 403);
  }

  const adminClient = createAdminClient();

  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    console.error('[admin/users/pending] listUsers error:', error);
    return apiError('Failed to fetch pending invitations', 500);
  }

  // Pending = invited but not yet email-confirmed
  const pending = users.filter((u) => u.invited_at && !u.email_confirmed_at);

  if (pending.length === 0) {
    return ok({ data: [] });
  }

  // Fetch roles from profiles (created by trigger when invite was sent)
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, role')
    .in('id', pending.map((u) => u.id));

  const roleMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.role]));

  return ok({
    data: pending.map((u) => ({
      id: u.id,
      email: u.email!,
      invited_at: u.invited_at,
      role: roleMap[u.id] ?? 'user',
    })),
  });
}
