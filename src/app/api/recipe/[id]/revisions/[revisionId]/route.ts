import { NextRequest } from 'next/server';
import { createClient, createAdminClient, getUserId } from '@/lib/supabase/server';
import { RecipeService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';

/** POST /api/recipe/[id]/revisions/[revisionId] — put the recipe back as it was in this revision */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; revisionId: string }> }) {
  const { id, revisionId } = await params;
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  const result = await RecipeService.restoreRevision(createAdminClient(), id, revisionId, await getUserId(supabase));
  if (!result.success) return apiError(result.error || 'Failed to restore', 400);
  return ok({ data: result.data });
}
