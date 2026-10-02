import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { IngredientService } from '@/lib/supabase/services';
import { cleanIngredientUpdate } from '@/lib/supabase/services/IngredientService';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';

/** PUT /api/ingredients/[id] — rename, change aisle or staple flag */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }
  const update = cleanIngredientUpdate(body ?? {});
  if (typeof update === 'string') return apiError(update, 400);

  const result = await IngredientService.update(createAdminClient(), id, update);
  if (!result.success) return apiError(result.error!, 400);
  return ok({ data: result.data });
}

/** DELETE /api/ingredients/[id] — only when no recipe uses it */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  const result = await IngredientService.remove(createAdminClient(), id);
  if (!result.success) return apiError(result.error!, 400);
  return ok({ success: true });
}
