// BOLT-ON: onboarding — safe to delete if not using the onboarding flow
import { createClient } from '@/lib/supabase/server';
import { ok, apiError } from '@/lib/api/response';

/**
 * PATCH /api/profile/onboarding
 *
 * Sets the current user's onboarding status.
 * Body: { completed?: boolean } — defaults to true.
 * Pass { completed: false } to reset onboarding (e.g. from the profile page).
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return apiError('Authentication required', 401);

    let completed = true;
    try {
      const body = await request.json() as { completed?: boolean };
      if (typeof body.completed === 'boolean') completed = body.completed;
    } catch {
      // No body — default to true (original behaviour)
    }

    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: completed })
      .eq('id', user.id);

    if (error) {
      console.error('PATCH /api/profile/onboarding error:', error);
      return apiError('Failed to update onboarding status', 500);
    }

    return ok({ success: true });
  } catch (error) {
    console.error('PATCH /api/profile/onboarding error:', error);
    return apiError('Internal server error', 500);
  }
}
