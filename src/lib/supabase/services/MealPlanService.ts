/**
 * MealPlanService - menus saved from What We Having?
 * All calls use the signed-in user's client (RLS keeps them private).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/types';
import type { RecipeSummary } from '@/types/recipe';
import { RECIPE_SUMMARY_SELECT, toRecipeSummary, type RawRecipeRow } from './RecipeService';

export interface MealPlanDish {
  slot: string;
  recipe_id: string;
}

export interface MealPlan {
  id: string;
  name: string;
  dishes: MealPlanDish[];
  options: Record<string, unknown>;
  created_at: string;
}

export interface MealPlanWithRecipes extends MealPlan {
  recipes: Record<string, RecipeSummary>;
}

class MealPlanServiceClass {
  async list(supabase: SupabaseClient, userId: string): Promise<ServiceResponse<MealPlanWithRecipes[]>> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('id, name, dishes, options, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[MealPlanService] list error:', error);
      return { success: false, error: 'Failed to load your saved menus' };
    }

    const plans = (data || []) as MealPlan[];
    const ids = [...new Set(plans.flatMap((p) => p.dishes.map((d) => d.recipe_id)))];
    const recipes: Record<string, RecipeSummary> = {};
    if (ids.length) {
      const { data: rows } = await supabase.from('recipes').select(RECIPE_SUMMARY_SELECT).in('id', ids);
      for (const row of (rows || []) as unknown as RawRecipeRow[]) recipes[row.id] = toRecipeSummary(row);
    }
    return { success: true, data: plans.map((p) => ({ ...p, recipes })) };
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    plan: { name: string; dishes: MealPlanDish[]; options: Record<string, unknown> }
  ): Promise<ServiceResponse<MealPlan>> {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ user_id: userId, ...plan })
      .select('id, name, dishes, options, created_at')
      .single();
    if (error) {
      console.error('[MealPlanService] create error:', error);
      return { success: false, error: 'Failed to save the menu' };
    }
    return { success: true, data: data as MealPlan };
  }

  async remove(supabase: SupabaseClient, userId: string, id: string): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from('meal_plans').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      console.error('[MealPlanService] remove error:', error);
      return { success: false, error: 'Failed to delete the menu' };
    }
    return { success: true, data: null };
  }
}

export const MealPlanService = new MealPlanServiceClass();
export default MealPlanService;
