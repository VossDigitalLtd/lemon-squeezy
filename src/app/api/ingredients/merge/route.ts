import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { IngredientService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';

/** POST /api/ingredients/merge — { from, into } move every use of one ingredient onto another */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  let body: { from?: string; into?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }
  if (!body.from || !body.into) return apiError('Choose both ingredients', 400);

  const result = await IngredientService.merge(createAdminClient(), body.from, body.into);
  if (!result.success) return apiError(result.error!, 400);
  return ok({ data: result.data });
}
