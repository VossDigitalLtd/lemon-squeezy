import { NextRequest } from 'next/server';
import { createClient, createAdminClient, getUserId } from '@/lib/supabase/server';
import { SettingsService, type SiteSettings } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';

/** GET /api/admin/settings — the site-wide settings */
export async function GET() {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;
  return ok({ data: await SettingsService.get(supabase) });
}

/** PUT /api/admin/settings — { show_recipe_inspiration?: boolean } */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }

  const changes: Partial<SiteSettings> = {};
  if ('show_recipe_inspiration' in body) {
    if (typeof body.show_recipe_inspiration !== 'boolean') return apiError('show_recipe_inspiration must be true or false', 400);
    changes.show_recipe_inspiration = body.show_recipe_inspiration;
  }
  if (Object.keys(changes).length === 0) return apiError('Nothing to update', 400);

  const userId = await getUserId(supabase);
  const result = await SettingsService.update(createAdminClient(), changes, userId!);
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data });
}
