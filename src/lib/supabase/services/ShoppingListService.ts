/**
 * ShoppingListService - one shopping list per person
 *
 * Stores the recipes on the list (with servings), which combined lines are
 * ticked, and the person's own extra items. Combining ingredients happens in
 * lib/shoppingList.ts. All calls use the signed-in user's client (RLS).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/types';
import type { ListRecipe } from '@/lib/shoppingList';

export interface ListRecipeRef {
  recipe_id: string;
  servings: number;
}

export interface ShoppingListDoc {
  recipes: ListRecipeRef[];
  checked: string[];
  extras: { id: string; text: string; checked: boolean }[];
}

export const EMPTY_LIST: ShoppingListDoc = { recipes: [], checked: [], extras: [] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate and tidy a list sent from the browser; returns an error message if it's not usable */
export function cleanListDoc(input: unknown): ShoppingListDoc | string {
  const doc = input as Partial<ShoppingListDoc> | null;
  if (!doc || typeof doc !== 'object') return 'Invalid list';
  const recipes = Array.isArray(doc.recipes) ? doc.recipes : [];
  const checked = Array.isArray(doc.checked) ? doc.checked : [];
  const extras = Array.isArray(doc.extras) ? doc.extras : [];

  if (recipes.length > 50) return 'A list can hold up to 50 recipes';
  if (extras.length > 200) return 'A list can hold up to 200 of your own items';
  for (const r of recipes) {
    if (!r || !UUID_RE.test(String(r.recipe_id)) || !Number.isInteger(r.servings) || r.servings < 1 || r.servings > 48) {
      return 'Each recipe needs an id and 1–48 servings';
    }
  }

  return {
    recipes: recipes.map((r) => ({ recipe_id: r.recipe_id, servings: r.servings })),
    checked: [...new Set(checked.filter((c) => typeof c === 'string' && c.length <= 300))].slice(0, 500),
    extras: extras
      .filter((e) => e && typeof e.text === 'string' && e.text.trim())
      .map((e) => ({ id: String(e.id || crypto.randomUUID()).slice(0, 64), text: e.text.trim().slice(0, 200), checked: !!e.checked })),
  };
}

class ShoppingListServiceClass {
  async get(supabase: SupabaseClient, userId: string): Promise<ServiceResponse<ShoppingListDoc>> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('recipes, checked, extras')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('[ShoppingListService] get error:', error);
      return { success: false, error: 'Failed to load your shopping list' };
    }
    return { success: true, data: data ? (data as ShoppingListDoc) : EMPTY_LIST };
  }

  async save(supabase: SupabaseClient, userId: string, doc: ShoppingListDoc): Promise<ServiceResponse<ShoppingListDoc>> {
    const { error } = await supabase.from('shopping_lists').upsert({ user_id: userId, ...doc }, { onConflict: 'user_id' });
    if (error) {
      console.error('[ShoppingListService] save error:', error);
      return { success: false, error: 'Failed to save your shopping list' };
    }
    return { success: true, data: doc };
  }

  /** Add recipes; a recipe already on the list takes the new servings */
  async addRecipes(supabase: SupabaseClient, userId: string, refs: ListRecipeRef[]): Promise<ServiceResponse<ShoppingListDoc>> {
    const current = await this.get(supabase, userId);
    if (!current.success) return current;
    const byId = new Map(current.data!.recipes.map((r) => [r.recipe_id, r]));
    for (const ref of refs) byId.set(ref.recipe_id, ref);
    return this.save(supabase, userId, { ...current.data!, recipes: [...byId.values()] });
  }

  /** The recipe details needed to build the list */
  async loadRecipes(supabase: SupabaseClient, ids: string[]): Promise<ListRecipe[]> {
    if (!ids.length) return [];
    const { data } = await supabase
      .from('recipes')
      .select('id, uid, title, servings, ingredient_groups, feature_image_path')
      .in('id', ids);
    return (data || []) as ListRecipe[];
  }
}

export const ShoppingListService = new ShoppingListServiceClass();
export default ShoppingListService;
