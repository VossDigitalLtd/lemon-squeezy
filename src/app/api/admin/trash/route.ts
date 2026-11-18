import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TrashService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';
import type { TrashKind } from '@/lib/trash';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: TrashKind[] = ['recipe', 'category'];

/** GET /api/admin/trash — deleted recipes and categories */
export async function GET() {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  const result = await TrashService.list(createAdminClient());
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data });
}

/** POST /api/admin/trash — { action: 'restore' | 'purge', kind, id } */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  let body: { action?: string; kind?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }
  if (body.action !== 'restore' && body.action !== 'purge') return apiError('action must be restore or purge', 400);
  if (!KINDS.includes(body.kind as TrashKind)) return apiError('kind must be recipe or category', 400);
  if (!body.id || !UUID_RE.test(body.id)) return apiError('id is required', 400);

  const admin = createAdminClient();
  const result =
    body.action === 'restore'
      ? await TrashService.restore(admin, body.kind as TrashKind, body.id)
      : await TrashService.purge(admin, body.kind as TrashKind, body.id);
  if (!result.success) return apiError(result.error!, 400);
  return ok({ success: true });
}
