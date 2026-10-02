import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { FeaturedService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';
import { addWeeks, weekStartOf } from '@/lib/weeks';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/admin/featured?back=4&ahead=16 — scheduled weeks around this one */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  const back = Math.min(52, Math.max(0, Number(request.nextUrl.searchParams.get('back') ?? 4)));
  const ahead = Math.min(104, Math.max(1, Number(request.nextUrl.searchParams.get('ahead') ?? 16)));
  const thisWeek = weekStartOf();
  const result = await FeaturedService.getSchedule(supabase, addWeeks(thisWeek, -back), addWeeks(thisWeek, ahead));
  if (!result.success) return apiError(result.error || 'Failed to load the schedule', 500);
  return ok({ data: result.data, thisWeek });
}

/** PUT /api/admin/featured — { week_start, recipe_id } sets that week's recipe */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  let body: { week_start?: string; recipe_id?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }
  if (!body.week_start || !DATE_RE.test(body.week_start)) return apiError('week_start must be a date (YYYY-MM-DD)', 400);
  if (!body.recipe_id || !UUID_RE.test(body.recipe_id)) return apiError('recipe_id is required', 400);

  const result = await FeaturedService.setWeek(createAdminClient(), body.week_start, body.recipe_id);
  if (!result.success) return apiError(result.error || 'Failed to save', 500);
  return ok({ success: true });
}

/** DELETE /api/admin/featured?week=YYYY-MM-DD — clears that week */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  const week = request.nextUrl.searchParams.get('week') ?? '';
  if (!DATE_RE.test(week)) return apiError('week must be a date (YYYY-MM-DD)', 400);

  const result = await FeaturedService.clearWeek(createAdminClient(), week);
  if (!result.success) return apiError(result.error || 'Failed to clear', 500);
  return ok({ success: true });
}
