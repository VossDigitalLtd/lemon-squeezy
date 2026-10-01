import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';
// BOLT-ON: audit-log — import AuditService after installing the audit-log bolt-on:
// import { AuditService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { rateLimit } from '@/lib/rateLimit';
import { VALID_ROLES, ADMIN_ASSIGNABLE_ROLES, rateLimits } from '@/lib/config/app';
import type { ValidRole } from '@/lib/config/app';

function isValidRole(role: unknown): role is ValidRole {
  return (VALID_ROLES as readonly string[]).includes(role as string);
}

/** PATCH /api/admin/users/[id] — update a user's name and/or role */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  const callerRole = await ProfileService.getRole(supabase);

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return apiError('Forbidden', 403);
  }

  if (caller?.id === id) {
    return apiError('Use the profile page to edit your own account', 400);
  }

  const { allowed: editAllowed } = rateLimit(`rl:${caller?.id}:user-edit`, rateLimits.userEdit.limit, rateLimits.userEdit.windowMs);
  if (!editAllowed) return apiError('Too many requests', 429);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }

  const { full_name, role } = body as { full_name?: string; role?: string };

  const updates: Record<string, unknown> = {};

  if (full_name !== undefined) {
    if (typeof full_name !== 'string') return apiError('full_name must be a string', 400);
    if (full_name.length > 100) return apiError('Full name must be 100 characters or fewer', 400);
    updates.full_name = full_name;
  }

  if (role !== undefined) {
    if (!isValidRole(role)) {
      return apiError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400);
    }
    // Admins can only assign user/admin roles — not super_admin
    if (callerRole === 'admin' && !ADMIN_ASSIGNABLE_ROLES.includes(role as ValidRole)) {
      return apiError('Admins can only assign the user or admin role', 403);
    }
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 400);
  }

  const adminClient = createAdminClient();

  // Check target user's current role — admins cannot edit other admins/super_admins
  if (callerRole === 'admin') {
    const { data: target } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (target?.role === 'admin' || target?.role === 'super_admin') {
      return apiError('Admins cannot edit other admin accounts', 403);
    }
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, email, full_name, role, avatar_url, created_at, last_login_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return apiError('User not found', 404);
    console.error('[admin/users/[id]] PATCH error:', error);
    return apiError('Failed to update user', 500);
  }

  // BOLT-ON: audit-log — add AuditService.log({ actorId: caller?.id, actorEmail: caller?.email,
  //   action: 'user.updated', resourceType: 'user', resourceId: id, metadata: updates }) here

  return ok({ data });
}

/** DELETE /api/admin/users/[id] — permanently delete a user */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  const callerRole = await ProfileService.getRole(supabase);

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return apiError('Forbidden', 403);
  }

  if (caller?.id === id) {
    return apiError('You cannot delete your own account', 400);
  }

  const { allowed: deleteAllowed } = rateLimit(`rl:${caller?.id}:user-delete`, rateLimits.userDelete.limit, rateLimits.userDelete.windowMs);
  if (!deleteAllowed) return apiError('Too many requests', 429);

  const adminClient = createAdminClient();

  // Admins cannot delete other admins/super_admins
  if (callerRole === 'admin') {
    const { data: target } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (target?.role === 'admin' || target?.role === 'super_admin') {
      return apiError('Admins cannot delete other admin accounts', 403);
    }
  }

  const { error } = await adminClient.auth.admin.deleteUser(id);

  if (error) {
    if (error.message?.includes('not found')) return apiError('User not found', 404);
    console.error('[admin/users/[id]] DELETE error:', error);
    return apiError('Failed to delete user', 500);
  }

  // BOLT-ON: audit-log — add AuditService.log({ actorId: caller?.id, actorEmail: caller?.email,
  //   action: 'user.deleted', resourceType: 'user', resourceId: id }) here

  return ok({ success: true });
}
