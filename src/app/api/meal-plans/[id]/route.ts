import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MealPlanService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

/** DELETE /api/meal-plans/[id] — delete one of your saved menus */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError('Sign in to manage your saved menus', 401);

  const result = await MealPlanService.remove(supabase, user.id, id);
  if (!result.success) return apiError(result.error!, 500);
  return ok({ success: true });
}
