import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FavouriteService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

/** POST /api/recipe/[id]/favourite — toggle favourite */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return apiError('Unauthorised', 401);
    }

    const result = await FavouriteService.toggle(supabase, user.id, recipeId);

    if (!result.success) {
      return apiError(result.error || 'Failed to toggle favourite', 500);
    }

    return ok({ data: result.data });
  } catch (error) {
    console.error('POST /api/recipe/[id]/favourite error:', error);
    return apiError('Internal server error', 500);
  }
}
