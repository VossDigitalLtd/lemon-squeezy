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

/** GET /api/admin/users — list all users with pagination + search */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const callerRole = await ProfileService.getRole(supabase);

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return apiError('Forbidden', 403);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));
  const search = searchParams.get('search')?.trim() ?? '';
  const roleFilter = searchParams.get('role') ?? '';
  const offset = (page - 1) * limit;

  const adminClient = createAdminClient();

  // Exclude invited-but-not-confirmed users — they appear in the Pending Invitations section
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const pendingIds = authUsers
    .filter((u) => u.invited_at && !u.email_confirmed_at)
    .map((u) => u.id);

  let query = adminClient
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at, last_login_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (pendingIds.length > 0) {
    query = query.not('id', 'in', `(${pendingIds.join(',')})`);
  }

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  if (roleFilter && isValidRole(roleFilter)) {
    query = query.eq('role', roleFilter);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[admin/users] GET error:', error);
    return apiError('Failed to fetch users', 500);
  }

  return ok({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/** POST /api/admin/users — invite a new user by email */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  const callerRole = await ProfileService.getRole(supabase);

  if (callerRole !== 'admin' && callerRole !== 'super_admin') {
    return apiError('Forbidden', 403);
  }

  const { allowed } = rateLimit(`rl:${caller?.id}:invite`, rateLimits.invite.limit, rateLimits.invite.windowMs);
  if (!allowed) return apiError('Too many requests. Please wait before inviting more users.', 429);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }

  const { email, full_name, role = 'user' } = body as {
    email?: string;
    full_name?: string;
    role?: string;
  };

  if (!email || typeof email !== 'string') {
    return apiError('Email is required', 400);
  }

  if (!isValidRole(role)) {
    return apiError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400);
  }

  // Admins cannot assign admin or super_admin roles — only super_admin can
  if (callerRole === 'admin' && !ADMIN_ASSIGNABLE_ROLES.includes(role as ValidRole)) {
    return apiError('Admins can only assign the user or admin role', 403);
  }

  const adminClient = createAdminClient();

  // Invite the user (sends an email; creates auth.users entry + triggers profile creation)
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    {
      data: full_name ? { full_name } : undefined,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    }
  );

  if (inviteError) {
    if (inviteError.message?.includes('already been registered')) {
      return apiError('A user with this email already exists', 409);
    }
    if (inviteError.status === 429) {
      return apiError('Email rate limit exceeded. Please wait a moment before sending more invitations.', 429);
    }
    console.error('[admin/users] invite error:', inviteError);
    return apiError('Failed to invite user', 500);
  }

  const userId = inviteData.user.id;

  // If role isn't the default 'user', update the profile that the trigger created
  if (role !== 'user') {
    const { error: roleError } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (roleError) {
      console.error('[admin/users] role update error:', roleError);
      // Non-fatal: user was created, just couldn't set the role
    }
  }

  // Fetch the created profile to return
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at, last_login_at')
    .eq('id', userId)
    .single();

  // BOLT-ON: audit-log — add AuditService.log({ actorId: caller?.id, actorEmail: caller?.email,
  //   action: 'user.invited', resourceType: 'user', resourceId: userId,
  //   metadata: { email: email.toLowerCase().trim(), role } }) here

  return ok({ data: profile }, 201);
}
