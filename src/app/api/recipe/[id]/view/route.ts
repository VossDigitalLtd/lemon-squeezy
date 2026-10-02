import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ok } from '@/lib/api/response';
import { isStaffRole } from '@/lib/auth/roles';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawl|spider|slurp|preview|fetch|headless|lighthouse/i;

/**
 * POST /api/recipe/[id]/view — record a recipe view for the reports.
 * Always answers 204-style ok so tracking never affects the page.
 * Skips bots and staff (editors checking pages would skew the numbers).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return ok({ recorded: false });
    if (BOT_RE.test(request.headers.get('user-agent') ?? '')) return ok({ recorded: false });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (isStaffRole(profile?.role)) return ok({ recorded: false });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('recipe_views').insert({ recipe_id: id, user_id: user?.id ?? null });
    if (error) {
      // e.g. the table hasn't been created yet; never break the page for this
      console.warn('[recipe view] not recorded:', error.message);
      return ok({ recorded: false });
    }
    return ok({ recorded: true });
  } catch (error) {
    console.warn('[recipe view] error:', error);
    return ok({ recorded: false });
  }
}
