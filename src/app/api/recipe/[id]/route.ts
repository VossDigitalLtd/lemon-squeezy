import { NextRequest } from 'next/server';
import { createClient, createAdminClient, getUserId } from '@/lib/supabase/server';
import { RecipeService, TrashService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';
import type { RecipeFormData } from '@/types/recipe';

/** GET /api/recipe/[id] — get a single recipe by ID */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const result = await RecipeService.getById(supabase, id);

    if (!result.success) {
      return apiError(result.error || 'Recipe not found', 404);
    }

    return ok({ data: result.data });
  } catch (error) {
    console.error('GET /api/recipe/[id] error:', error);
    return apiError('Internal server error', 500);
  }
}

/** PUT /api/recipe/[id] — update a recipe */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    // Only editors and admins can change content

    const denied = await requireStaff(supabase);

    if (denied) return denied;

    let body: RecipeFormData;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 400);
    }

    if (!body.title?.trim()) {
      return apiError('Title is required', 400);
    }

    const adminClient = createAdminClient();
    const result = await RecipeService.updateRecipe(adminClient, id, body, {
      source: 'admin',
      userId: await getUserId(supabase),
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to update recipe', 400);
    }

    return ok({ data: result.data });
  } catch (error) {
    console.error('PUT /api/recipe/[id] error:', error);
    return apiError('Internal server error', 500);
  }
}

/** DELETE /api/recipe/[id] — move a recipe to the trash */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    // Only editors and admins can change content

    const denied = await requireStaff(supabase);

    if (denied) return denied;

    const adminClient = createAdminClient();
    const result = await RecipeService.deleteRecipe(adminClient, id);
    // Clear out anything that's been in the trash past its time
    await TrashService.purgeExpired(adminClient);

    if (!result.success) {
      return apiError(result.error || 'Failed to delete recipe', 400);
    }

    return ok({ success: true });
  } catch (error) {
    console.error('DELETE /api/recipe/[id] error:', error);
    return apiError('Internal server error', 500);
  }
}
