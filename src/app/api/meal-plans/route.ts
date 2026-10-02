import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MealPlanService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/meal-plans — the signed-in person's saved menus */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError('Sign in to see your saved menus', 401);

  const result = await MealPlanService.list(supabase, user.id);
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data });
}

/** POST /api/meal-plans — { name, dishes: [{ slot, recipe_id }], options } */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError('Sign in to save menus', 401);

  let body: { name?: string; dishes?: { slot?: string; recipe_id?: string }[]; options?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }

  const name = (body.name ?? '').trim().slice(0, 120);
  if (!name) return apiError('Give the menu a name', 400);
  const dishes = (body.dishes ?? [])
    .filter((d) => d && typeof d.slot === 'string' && UUID_RE.test(String(d.recipe_id)))
    .map((d) => ({ slot: d.slot!.slice(0, 20), recipe_id: d.recipe_id! }))
    .slice(0, 10);
  if (!dishes.length) return apiError('A menu needs at least one dish', 400);
  const options = body.options && typeof body.options === 'object' ? body.options : {};

  const result = await MealPlanService.create(supabase, user.id, { name, dishes, options });
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data }, 201);
}
