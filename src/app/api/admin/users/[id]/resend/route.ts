import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { rateLimit } from '@/lib/rateLimit';
import { rateLimits } from '@/lib/config/app';

/** POST /api/admin/users/[id]/resend — resend an invitation email to a pending user */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  const callerRole = await ProfileService.getRole(supabase);

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return apiError('Forbidden', 403);
  }

  const { allowed } = rateLimit(
    `rl:${caller?.id}:invite`,
    rateLimits.invite.limit,
    rateLimits.invite.windowMs
  );
  if (!allowed) return apiError('Too many requests', 429);

  const adminClient = createAdminClient();

  // Fetch the target user to verify they're still pending
  const { data: { user: target }, error: fetchError } = await adminClient.auth.admin.getUserById(id);

  if (fetchError || !target) {
    return apiError('User not found', 404);
  }

  if (target.email_confirmed_at) {
    return apiError('This user has already accepted their invitation', 400);
  }

  // Resend: calling inviteUserByEmail on an unconfirmed user resets the token and resends
  const { error } = await adminClient.auth.admin.inviteUserByEmail(target.email!, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });

  if (error) {
    console.error('[admin/users/[id]/resend] error:', error);
    return apiError('Failed to resend invitation', 500);
  }

  return ok({ success: true });
}
