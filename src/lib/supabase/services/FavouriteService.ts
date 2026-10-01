/**
 * FavouriteService - User recipe favourites
 *
 * Manages the user ↔ recipe favourites junction table.
 * All operations use the authenticated user's client (RLS enforces ownership).
 *
 * Usage:
 *   import { FavouriteService } from '@/lib/supabase/services';
 *
 *   const ids = await FavouriteService.getUserFavouriteIds(supabase, userId);
 *   await FavouriteService.toggle(supabase, userId, recipeId);
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/types';

class FavouriteServiceClass {
  /**
   * Get all favourite recipe IDs for a user
   */
  async getUserFavouriteIds(
    supabase: SupabaseClient,
    userId: string
  ): Promise<ServiceResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('favourites')
        .select('recipe_id')
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        data: (data || []).map((row) => row.recipe_id),
      };
    } catch (error) {
      console.error('[FavouriteService] getUserFavouriteIds error:', error);
      return { success: false, error: 'Failed to load favourites' };
    }
  }

  /**
   * Check if a specific recipe is favourited by the user
   */
  async isFavourited(
    supabase: SupabaseClient,
    userId: string,
    recipeId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('favourites')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', recipeId)
      .maybeSingle();

    return !!data;
  }

  /**
   * Add a recipe to favourites
   */
  async add(
    supabase: SupabaseClient,
    userId: string,
    recipeId: string
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('favourites')
        .insert({ user_id: userId, recipe_id: recipeId });

      if (error) {
        // Duplicate — already favourited, treat as success
        if (error.code === '23505') return { success: true, data: null };
        throw error;
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('[FavouriteService] add error:', error);
      return { success: false, error: 'Failed to add favourite' };
    }
  }

  /**
   * Remove a recipe from favourites
   */
  async remove(
    supabase: SupabaseClient,
    userId: string,
    recipeId: string
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('favourites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId);

      if (error) throw error;

      return { success: true, data: null };
    } catch (error) {
      console.error('[FavouriteService] remove error:', error);
      return { success: false, error: 'Failed to remove favourite' };
    }
  }

  /**
   * Toggle a favourite — add if missing, remove if present
   */
  async toggle(
    supabase: SupabaseClient,
    userId: string,
    recipeId: string
  ): Promise<ServiceResponse<{ favourited: boolean }>> {
    const exists = await this.isFavourited(supabase, userId, recipeId);

    if (exists) {
      const result = await this.remove(supabase, userId, recipeId);
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: { favourited: false } };
    } else {
      const result = await this.add(supabase, userId, recipeId);
      if (!result.success) return { success: false, error: result.error };
      return { success: true, data: { favourited: true } };
    }
  }
}

export const FavouriteService = new FavouriteServiceClass();
export default FavouriteService;
