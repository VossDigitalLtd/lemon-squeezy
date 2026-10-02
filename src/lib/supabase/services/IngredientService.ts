/**
 * IngredientService - the ingredient library
 *
 * Public read. Writes (create, rename, aisle, staple, merge, delete) use the
 * admin client from staff-only API routes.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/types';
import type { IngredientGroup, LibraryIngredient } from '@/types/recipe';
import { AISLES, guessAisle, isStaple, slugify, parseIngredientName, type Aisle } from '@/lib/ingredientMatch';

const SELECT = 'id, name, slug, category, is_staple';

export interface IngredientUpdate {
  name?: string;
  category?: Aisle;
  is_staple?: boolean;
}

/** Validate an update from the browser; returns an error message if unusable */
export function cleanIngredientUpdate(body: Record<string, unknown>): IngredientUpdate | string {
  const u: IngredientUpdate = {};
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) return 'Name must be 1–80 characters';
    u.name = body.name.trim();
  }
  if ('category' in body) {
    if (!(AISLES as readonly string[]).includes(String(body.category))) return 'Unknown aisle';
    u.category = body.category as Aisle;
  }
  if ('is_staple' in body) {
    if (typeof body.is_staple !== 'boolean') return 'is_staple must be true or false';
    u.is_staple = body.is_staple;
  }
  return Object.keys(u).length ? u : 'Nothing to update';
}

class IngredientServiceClass {
  /** The whole library, with how many recipes use each entry */
  async list(supabase: SupabaseClient): Promise<ServiceResponse<LibraryIngredient[]>> {
    const { data, error } = await supabase
      .from('ingredients')
      .select(`${SELECT}, recipe_ingredients(count)`)
      .order('name');
    if (error) {
      console.error('[IngredientService] list error:', error);
      return { success: false, error: 'Failed to load ingredients' };
    }
    return {
      success: true,
      data: (data || []).map((row) => {
        const { recipe_ingredients, ...rest } = row as LibraryIngredient & { recipe_ingredients: { count: number }[] };
        return { ...rest, recipe_count: recipe_ingredients?.[0]?.count ?? 0 };
      }),
    };
  }

  /** Create an entry (or return the existing one with that name or alias) */
  async create(admin: SupabaseClient, name: string, category?: Aisle): Promise<ServiceResponse<LibraryIngredient>> {
    const clean = name.trim();
    const existing = await this.findByName(admin, clean);
    if (existing) return { success: true, data: existing };

    const core = parseIngredientName(clean).core || clean.toLowerCase();
    const { data, error } = await admin
      .from('ingredients')
      .insert({ name: clean, slug: await this.uniqueSlug(admin, clean), category: category ?? guessAisle(core), is_staple: isStaple(core) })
      .select(SELECT)
      .single();
    if (error) {
      console.error('[IngredientService] create error:', error);
      return { success: false, error: 'Failed to add the ingredient' };
    }
    await admin
      .from('ingredient_aliases')
      .upsert([{ alias: clean.toLowerCase(), ingredient_id: data.id }, { alias: core, ingredient_id: data.id }], { onConflict: 'alias', ignoreDuplicates: true });
    return { success: true, data: data as LibraryIngredient };
  }

  /** Find an entry by its name or any other name it's known by */
  async findByName(supabase: SupabaseClient, name: string): Promise<LibraryIngredient | null> {
    const lower = name.trim().toLowerCase();
    const { data: byName } = await supabase.from('ingredients').select(SELECT).ilike('name', lower).maybeSingle();
    if (byName) return byName as LibraryIngredient;
    const keys = [...new Set([lower, parseIngredientName(name).core].filter(Boolean))];
    const { data: alias } = await supabase.from('ingredient_aliases').select(`ingredient:ingredients(${SELECT})`).in('alias', keys).limit(1).maybeSingle();
    return ((alias as unknown as { ingredient: LibraryIngredient } | null)?.ingredient ?? null) as LibraryIngredient | null;
  }

  async update(admin: SupabaseClient, id: string, update: IngredientUpdate): Promise<ServiceResponse<LibraryIngredient>> {
    const patch: Record<string, unknown> = { ...update };
    if (update.name) patch.slug = await this.uniqueSlug(admin, update.name, id);
    const { data, error } = await admin.from('ingredients').update(patch).eq('id', id).select(SELECT).single();
    if (error) {
      console.error('[IngredientService] update error:', error);
      return { success: false, error: error.code === '23505' ? 'Another ingredient already has that name. Merge them instead.' : 'Failed to update the ingredient' };
    }
    if (update.name) {
      await admin.from('ingredient_aliases').upsert({ alias: update.name.toLowerCase(), ingredient_id: id }, { onConflict: 'alias', ignoreDuplicates: true });
    }
    return { success: true, data: data as LibraryIngredient };
  }

  /**
   * Merge one entry into another: every recipe line pointing at `fromId`
   * now points at `intoId`, its other names move across, and it's deleted.
   */
  async merge(admin: SupabaseClient, fromId: string, intoId: string): Promise<ServiceResponse<{ recipes: number }>> {
    if (fromId === intoId) return { success: false, error: 'Choose a different ingredient to merge into' };
    const [{ data: from }, { data: into }] = await Promise.all([
      admin.from('ingredients').select('id, name').eq('id', fromId).maybeSingle(),
      admin.from('ingredients').select('id, name').eq('id', intoId).maybeSingle(),
    ]);
    if (!from || !into) return { success: false, error: 'Ingredient not found' };

    const { data: links } = await admin.from('recipe_ingredients').select('recipe_id').eq('ingredient_id', fromId);
    const recipeIds = (links || []).map((l) => l.recipe_id as string);

    if (recipeIds.length) {
      const { data: recipes } = await admin.from('recipes').select('id, ingredient_groups').in('id', recipeIds);
      for (const r of (recipes || []) as { id: string; ingredient_groups: IngredientGroup[] }[]) {
        const groups = r.ingredient_groups.map((g) => ({
          ...g,
          items: g.items.map((i) => (i.ingredient_id === fromId ? { ...i, ingredient_id: intoId } : i)),
        }));
        const { error } = await admin.from('recipes').update({ ingredient_groups: groups }).eq('id', r.id);
        if (error) return { success: false, error: 'Failed to update a recipe while merging' };
      }
      await admin.from('recipe_ingredients').upsert(recipeIds.map((recipe_id) => ({ recipe_id, ingredient_id: intoId })), { ignoreDuplicates: true });
    }

    await admin.from('ingredient_aliases').update({ ingredient_id: intoId }).eq('ingredient_id', fromId);
    await admin.from('ingredient_aliases').upsert({ alias: from.name.toLowerCase(), ingredient_id: intoId }, { onConflict: 'alias' });
    const { error } = await admin.from('ingredients').delete().eq('id', fromId);
    if (error) return { success: false, error: 'Failed to remove the merged ingredient' };
    return { success: true, data: { recipes: recipeIds.length } };
  }

  /** Delete an entry no recipe uses */
  async remove(admin: SupabaseClient, id: string): Promise<ServiceResponse<null>> {
    const { count } = await admin.from('recipe_ingredients').select('*', { count: 'exact', head: true }).eq('ingredient_id', id);
    if (count) return { success: false, error: `Used in ${count} recipe${count === 1 ? '' : 's'}. Merge it into another ingredient instead.` };
    const { error } = await admin.from('ingredients').delete().eq('id', id);
    return error ? { success: false, error: 'Failed to delete the ingredient' } : { success: true, data: null };
  }

  private async uniqueSlug(admin: SupabaseClient, name: string, ignoreId?: string): Promise<string> {
    const base = slugify(name) || 'ingredient';
    for (let n = 1; n < 50; n++) {
      const slug = n === 1 ? base : `${base}-${n}`;
      let q = admin.from('ingredients').select('id').eq('slug', slug);
      if (ignoreId) q = q.neq('id', ignoreId);
      const { data } = await q.maybeSingle();
      if (!data) return slug;
    }
    return `${base}-${Date.now()}`;
  }
}

export const IngredientService = new IngredientServiceClass();
export default IngredientService;
