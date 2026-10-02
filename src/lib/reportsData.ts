import { createAdminClient } from '@/lib/supabase/server';
import { RECIPE_SUMMARY_SELECT, toRecipeSummary, type RawRecipeRow } from '@/lib/supabase/services/RecipeService';
import { buildReport, type Report, type ReportRecipe } from '@/lib/reports';

/**
 * Load everything the reports need. Uses the service-role client because
 * favourites and profiles are private per user; only call this after
 * checking the viewer is staff. Only totals leave this function.
 */
export async function loadReport(): Promise<Report> {
  const admin = createAdminClient();

  const [recipes, favourites, profiles, pairings] = await Promise.all([
    admin.from('recipes').select(`${RECIPE_SUMMARY_SELECT}, published_at, featured_from`),
    admin.from('favourites').select('user_id, recipe_id, created_at'),
    admin.from('profiles').select('id, role, created_at, last_login_at'),
    admin.from('recipe_accompanying').select('recipe_id, accompanying_id'),
  ]);

  for (const r of [recipes, favourites, profiles, pairings]) {
    if (r.error) throw r.error;
  }

  const rows = (recipes.data || []) as unknown as (RawRecipeRow & { published_at: string; featured_from: string | null })[];

  return buildReport({
    recipes: rows.map((row): ReportRecipe => ({
      ...toRecipeSummary(row),
      published_at: row.published_at,
      featured_from: row.featured_from,
    })),
    favourites: favourites.data || [],
    profiles: profiles.data || [],
    pairings: pairings.data || [],
  });
}
