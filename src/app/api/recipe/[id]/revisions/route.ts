import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { RevisionService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';

/** GET /api/recipe/[id]/revisions — the recipe's undo history, newest first */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  const result = await RevisionService.list(createAdminClient(), id);
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data });
}
