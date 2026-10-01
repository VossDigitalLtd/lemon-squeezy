import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { RecipeService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import type { RecipeFormData } from '@/types/recipe';

/** GET /api/recipe — list recipes with search + pagination */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const result = await RecipeService.getAll(supabase, {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to load recipes', 500);
    }

    return ok({ data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error('GET /api/recipe error:', error);
    return apiError('Internal server error', 500);
  }
}

/** POST /api/recipe — create a new recipe */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('Authentication required', 401);
    }

    let body: RecipeFormData;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 400);
    }

    if (!body.title?.trim()) {
      return apiError('Title is required', 400);
    }

    if (!body.uid?.trim()) {
      return apiError('UID is required', 400);
    }

    const adminClient = createAdminClient();
    const result = await RecipeService.createRecipe(adminClient, body);

    if (!result.success) {
      return apiError(result.error || 'Failed to create recipe', 400);
    }

    return ok({ data: result.data }, 201);
  } catch (error) {
    console.error('POST /api/recipe error:', error);
    return apiError('Internal server error', 500);
  }
}
