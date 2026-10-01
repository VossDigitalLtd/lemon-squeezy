import type { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';
// BOLT-ON: audit-log — import AuditService after installing the audit-log bolt-on:
// import { AuditService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

export async function GET() {
  try {
    const supabase = await createClient();
    const result = await ProfileService.getProfile(supabase);

    if (!result.success) {
      return apiError(result.error ?? 'Not found', result.error === 'Authentication required' ? 401 : 404);
    }

    return ok({ data: result.data });
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('Authentication required', 401);
    }

    // BOLT-ON: audit-log — add AuditService.log({ actorId: user.id, actorEmail: user.email,
    //   action: 'account.deleted', resourceType: 'user', resourceId: user.id,
    //   metadata: { email: user.email } }) here

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error('DELETE /api/profile error:', error);
      return apiError('Failed to delete account', 500);
    }

    return ok({ success: true });
  } catch (error) {
    console.error('DELETE /api/profile error:', error);
    return apiError('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json();

    const result = await ProfileService.updateProfile(supabase, body);

    if (!result.success) {
      return apiError(result.error ?? 'Bad request', result.error === 'Authentication required' ? 401 : 400);
    }

    // BOLT-ON: audit-log — add AuditService.log({ actorId: user?.id, actorEmail: user?.email,
    //   action: 'profile.updated', resourceType: 'profile', resourceId: user?.id,
    //   metadata: body }) here

    return ok({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/profile error:', error);
    return apiError('Internal server error', 500);
  }
}
