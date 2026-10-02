import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShoppingListService } from '@/lib/supabase/services';
import { cleanListDoc, type ListRecipeRef } from '@/lib/supabase/services/ShoppingListService';
import { ok, apiError } from '@/lib/api/response';

async function signedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** GET /api/shopping-list — the list plus the recipe details needed to combine it */
export async function GET() {
  const { supabase, user } = await signedIn();
  if (!user) return apiError('Sign in to use a shopping list', 401);

  const list = await ShoppingListService.get(supabase, user.id);
  if (!list.success) return apiError(list.error!, 500);
  const recipes = await ShoppingListService.loadRecipes(supabase, list.data!.recipes.map((r) => r.recipe_id));
  const library = await ShoppingListService.loadLibrary(supabase, recipes);
  return ok({ data: { list: list.data, recipes, library } });
}

/** PUT /api/shopping-list — replace the whole list (recipes, ticks, own items) */
export async function PUT(request: NextRequest) {
  const { supabase, user } = await signedIn();
  if (!user) return apiError('Sign in to use a shopping list', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }
  const doc = cleanListDoc(body);
  if (typeof doc === 'string') return apiError(doc, 400);

  const result = await ShoppingListService.save(supabase, user.id, doc);
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: result.data });
}

/** POST /api/shopping-list — { recipes: [{ recipe_id, servings? }] } adds recipes to the list */
export async function POST(request: NextRequest) {
  const { supabase, user } = await signedIn();
  if (!user) return apiError('Sign in to use a shopping list', 401);

  let body: { recipes?: ListRecipeRef[] };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }
  // Recipes added without servings (e.g. a whole menu) use the recipe's own
  const refs = body.recipes ?? [];
  const missing = refs.filter((r) => r && !r.servings).map((r) => r.recipe_id);
  if (missing.length) {
    const defaults = await ShoppingListService.loadRecipes(supabase, missing);
    const servingsOf = new Map(defaults.map((r) => [r.id, r.servings || 4]));
    for (const r of refs) if (r && !r.servings) r.servings = servingsOf.get(r.recipe_id) ?? 4;
  }
  const check = cleanListDoc({ recipes: refs });
  if (typeof check === 'string') return apiError(check, 400);
  if (!check.recipes.length) return apiError('No recipes to add', 400);

  const result = await ShoppingListService.addRecipes(supabase, user.id, check.recipes);
  if (!result.success) return apiError(result.error!, 500);
  return ok({ data: { count: result.data!.recipes.length } });
}
