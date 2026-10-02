import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';
import { apiError } from '@/lib/api/response';
import { isStaffRole } from './roles';

/**
 * For API routes that change content. Returns an error response to send
 * back, or null when the signed-in user is an editor or admin.
 *
 *   const denied = await requireStaff(supabase);
 *   if (denied) return denied;
 */
export async function requireStaff(supabase: SupabaseClient): Promise<NextResponse | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError('Authentication required', 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!isStaffRole(profile?.role)) {
    return apiError("You don't have permission to do that", 403);
  }
  return null;
}
