import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { IngredientService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';
import { AISLES, type Aisle } from '@/lib/ingredientMatch';

/** GET /api/ingredients — the ingredient library with usage counts */
export async function GET() {
  const result = await IngredientService.list(await createClient());
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data });
}

/** POST /api/ingredients — { name, category? } add an entry (or get the existing one) */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const denied = await requireStaff(supabase);
  if (denied) return denied;

  let body: { name?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }
  const name = (body.name ?? '').trim();
  if (!name || name.length > 80) return apiError('Name must be 1–80 characters', 400);
  const category = (AISLES as readonly string[]).includes(String(body.category)) ? (body.category as Aisle) : undefined;

  const result = await IngredientService.create(createAdminClient(), name, category);
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data }, 201);
}
