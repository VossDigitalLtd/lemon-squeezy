/**
 * FeaturedService - Recipe of the week schedule
 *
 * One recipe per week (weeks start Monday). Public read; writes go through
 * the admin API with the service-role client.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/types';
import type { RecipeSummary } from '@/types/recipe';
import { RECIPE_SUMMARY_SELECT, toRecipeSummary, type RawRecipeRow } from './RecipeService';
import { weekStartOf } from '@/lib/weeks';

export interface ScheduledWeek {
  week_start: string;
  recipe: RecipeSummary;
}

class FeaturedServiceClass {
  /** Scheduled weeks between two week starts (inclusive), oldest first */
  async getSchedule(supabase: SupabaseClient, from: string, to: string): Promise<ServiceResponse<ScheduledWeek[]>> {
    try {
      const { data, error } = await supabase
        .from('featured_schedule')
        .select(`week_start, recipe:recipes(${RECIPE_SUMMARY_SELECT})`)
        .gte('week_start', from)
        .lte('week_start', to)
        .order('week_start', { ascending: true });
      if (error) throw error;

      const rows = (data || []) as unknown as { week_start: string; recipe: RawRecipeRow | null }[];
      return {
        success: true,
        data: rows.filter((r) => r.recipe).map((r) => ({ week_start: r.week_start, recipe: toRecipeSummary(r.recipe!) })),
      };
    } catch (error) {
      console.error('[FeaturedService] getSchedule error:', error);
      return { success: false, error: 'Failed to load the schedule' };
    }
  }

  /** Recipe id scheduled for the week containing `date`, if any */
  async getRecipeIdForWeek(supabase: SupabaseClient, date: Date = new Date()): Promise<string | null> {
    const { data } = await supabase
      .from('featured_schedule')
      .select('recipe_id')
      .eq('week_start', weekStartOf(date))
      .maybeSingle();
    return data?.recipe_id ?? null;
  }

  /** Set (or replace) the recipe for a week. Use the admin client. */
  async setWeek(supabase: SupabaseClient, weekStart: string, recipeId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('featured_schedule')
        .upsert({ week_start: weekStartOf(weekStart), recipe_id: recipeId }, { onConflict: 'week_start' });
      if (error) throw error;
      return { success: true, data: null };
    } catch (error) {
      console.error('[FeaturedService] setWeek error:', error);
      return { success: false, error: 'Failed to save the week' };
    }
  }

  /** Clear a week. Use the admin client. */
  async clearWeek(supabase: SupabaseClient, weekStart: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase.from('featured_schedule').delete().eq('week_start', weekStartOf(weekStart));
      if (error) throw error;
      return { success: true, data: null };
    } catch (error) {
      console.error('[FeaturedService] clearWeek error:', error);
      return { success: false, error: 'Failed to clear the week' };
    }
  }
}

export const FeaturedService = new FeaturedServiceClass();
export default FeaturedService;
