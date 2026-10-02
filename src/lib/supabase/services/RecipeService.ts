/**
 * RecipeService - Recipe management with junction tables
 *
 * Handles recipe CRUD including category associations and accompanying recipes.
 * Public read via RLS, writes via service role (admin client).
 *
 * Usage:
 *   import { RecipeService } from '@/lib/supabase/services';
 *
 *   const list = await RecipeService.getAll(supabase);
 *   const recipe = await RecipeService.getByUid(supabase, 'chicken-tikka');
 *   await RecipeService.createRecipe(adminClient, formData);
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseQueryService } from '../core/BaseQueryService';
import { weekStartOf } from '@/lib/weeks';
import { cleanRestPeriods, type RestPeriod } from '@/lib/rest';
import { parseIngredientName } from '@/lib/ingredientMatch';
import type { ServiceResponse } from '@/types';
import type {
  Recipe,
  RecipeSummary,
  RecipeFormData,
  Category,
} from '@/types/recipe';

// Select strings for Supabase queries
export const RECIPE_SUMMARY_SELECT = `
  id, uid, title, subtitle, short_description,
  feature_image_path, feature_image_alt,
  prep_time, cook_time, rest_time, total_time,
  recipe_categories(category:categories(id, type, uid, title)),
  recipe_ingredients(ingredient_id)
`;

const RECIPE_FULL_SELECT = `
  id, uid, title, subtitle, short_description, full_description,
  feature_image_path, feature_image_alt,
  prep_time, cook_time, rest_time, rest_periods, total_time, servings, calories_per_serving,
  ingredient_groups, method_groups,
  serving_suggestions, tips,
  published_at,
  created_at, updated_at,
  recipe_categories(category:categories(id, type, uid, title)),
  recipe_accompanying!recipe_accompanying_recipe_id_fkey(accompanying:recipes!recipe_accompanying_accompanying_id_fkey(
    id, uid, title, subtitle, short_description, feature_image_path, feature_image_alt,
    prep_time, cook_time, rest_time, total_time,
    recipe_categories(category:categories(id, type, uid, title))
  ))
`;

export interface RawRecipeRow {
  id: string;
  uid: string;
  title: string;
  subtitle?: string;
  short_description: string;
  full_description?: string;
  feature_image_path: string | null;
  feature_image_alt: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  total_time?: number | null;
  rest_time?: number | null;
  rest_periods?: RestPeriod[] | null;
  servings?: number | null;
  calories_per_serving?: number | null;
  ingredient_groups?: Recipe['ingredient_groups'];
  method_groups?: Recipe['method_groups'];
  serving_suggestions?: string;
  tips?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  recipe_categories: { category: Category }[];
  recipe_ingredients?: { ingredient_id: string }[];
  recipe_accompanying?: { accompanying: RawRecipeRow }[];
}

/**
 * Transform raw Supabase join data into flat Recipe/RecipeSummary types
 */
function transformCategories(row: RawRecipeRow) {
  const cats = (row.recipe_categories || []).map((rc) => rc.category);
  return {
    course_categories: cats.filter((c) => c.type === 'course'),
    cuisine_categories: cats.filter((c) => c.type === 'cuisine'),
    dietary_categories: cats.filter((c) => c.type === 'dietary'),
  };
}

export function toRecipeSummary(row: RawRecipeRow): RecipeSummary {
  return {
    id: row.id,
    uid: row.uid,
    title: row.title,
    subtitle: row.subtitle || '',
    short_description: row.short_description,
    feature_image_path: row.feature_image_path,
    feature_image_alt: row.feature_image_alt,
    prep_time: row.prep_time ?? null,
    cook_time: row.cook_time ?? null,
    rest_time: row.rest_time ?? null,
    total_time: row.total_time ?? null,
    ...transformCategories(row),
    ingredient_ids: (row.recipe_ingredients || []).map((ri) => ri.ingredient_id),
  };
}

function toRecipe(row: RawRecipeRow): Recipe {
  return {
    id: row.id,
    uid: row.uid,
    title: row.title,
    subtitle: row.subtitle || '',
    short_description: row.short_description,
    full_description: row.full_description || '',
    feature_image_path: row.feature_image_path,
    feature_image_alt: row.feature_image_alt,
    prep_time: row.prep_time ?? null,
    cook_time: row.cook_time ?? null,
    servings: row.servings ?? null,
    calories_per_serving: row.calories_per_serving ?? null,
    rest_time: row.rest_time ?? null,
    rest_periods: row.rest_periods ?? [],
    total_time: row.total_time ?? null,
    ingredient_groups: row.ingredient_groups || [],
    method_groups: row.method_groups || [],
    serving_suggestions: row.serving_suggestions || '',
    tips: row.tips || '',
    published_at: row.published_at || row.created_at || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    ...transformCategories(row),
    accompanying_recipes: (row.recipe_accompanying || []).map((ra) => toRecipeSummary(ra.accompanying)),
  };
}

class RecipeServiceClass extends BaseQueryService {
  constructor() {
    super('recipes', {
      searchFields: ['title', 'short_description'],
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableCache: true,
      cacheTTL: 60000, // 1 minute
      useSoftDelete: false,
    });
  }

  /**
   * Get all recipes as summaries (for listing pages)
   */
  async getAll(
    supabase: SupabaseClient,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      /** Only recipes whose total time is at most this many minutes */
      maxTime?: number;
      /** Only recipes with a feature image */
      withImage?: boolean;
      excludeIds?: string[];
    } = {}
  ): Promise<ServiceResponse<RecipeSummary[]> & { pagination?: Record<string, unknown> }> {
    try {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 25));
      const offset = (page - 1) * limit;

      let query = supabase
        .from('recipes')
        .select(RECIPE_SUMMARY_SELECT, { count: 'exact' });

      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,short_description.ilike.%${options.search}%`);
      }

      if (options.categoryId) {
        // Filter by category via junction table
        const { data: recipeIds } = await supabase
          .from('recipe_categories')
          .select('recipe_id')
          .eq('category_id', options.categoryId);

        if (recipeIds && recipeIds.length > 0) {
          query = query.in('id', recipeIds.map((r) => r.recipe_id));
        } else {
          return { success: true, data: [], pagination: { currentPage: page, pageSize: limit, totalCount: 0, totalPages: 0 } };
        }
      }

      if (options.maxTime) {
        query = query.lte('total_time', options.maxTime);
      }

      if (options.withImage) {
        query = query.not('feature_image_path', 'is', null);
      }

      if (options.excludeIds?.length) {
        query = query.not('id', 'in', `(${options.excludeIds.join(',')})`);
      }

      query = query
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: ((data || []) as unknown as RawRecipeRow[]).map(toRecipeSummary),
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('[RecipeService] getAll error:', error);
      return { success: false, error: 'Failed to load recipes' };
    }
  }

  /**
   * Recipe of the week: this week's entry in the featured schedule (see
   * FeaturedService). Falls back to the newest recipe with a photo.
   */
  async getFeatured(supabase: SupabaseClient, date: Date = new Date()): Promise<ServiceResponse<Recipe | null>> {
    try {
      const { data: scheduled } = await supabase
        .from('featured_schedule')
        .select('recipe_id')
        .eq('week_start', weekStartOf(date))
        .maybeSingle();

      if (scheduled?.recipe_id) {
        const result = await this.getById(supabase, scheduled.recipe_id);
        if (result.success && result.data) return result;
      }

      const { data: fallback, error } = await supabase
        .from('recipes')
        .select(RECIPE_FULL_SELECT)
        .not('feature_image_path', 'is', null)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data: fallback ? toRecipe(fallback as unknown as RawRecipeRow) : null };
    } catch (error) {
      console.error('[RecipeService] getFeatured error:', error);
      return { success: false, error: 'Failed to load featured recipe' };
    }
  }

  /**
   * Recipes in a category looked up by type + uid, e.g. ('cuisine', 'cypriot')
   */
  async getByCategoryUid(
    supabase: SupabaseClient,
    type: Category['type'],
    uid: string,
    options: { limit?: number; withImage?: boolean } = {}
  ): Promise<ServiceResponse<RecipeSummary[]>> {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('type', type)
      .eq('uid', uid)
      .maybeSingle();

    if (!category) return { success: true, data: [] };

    const result = await this.getAll(supabase, { ...options, categoryId: category.id });
    return result.success
      ? { success: true, data: result.data }
      : { success: false, error: result.error };
  }

  /**
   * Get a single recipe by UID (for public pages)
   */
  async getByUid(
    supabase: SupabaseClient,
    uid: string
  ): Promise<ServiceResponse<Recipe>> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(RECIPE_FULL_SELECT)
        .eq('uid', uid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Recipe not found' };
        }
        throw error;
      }

      return { success: true, data: toRecipe(data as unknown as RawRecipeRow) };
    } catch (error) {
      console.error('[RecipeService] getByUid error:', error);
      return { success: false, error: 'Failed to load recipe' };
    }
  }

  /**
   * Get a single recipe by ID (for admin edit)
   */
  async getById(
    supabase: SupabaseClient,
    id: string
  ): Promise<ServiceResponse<Recipe>> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(RECIPE_FULL_SELECT)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Recipe not found' };
        }
        throw error;
      }

      return { success: true, data: toRecipe(data as unknown as RawRecipeRow) };
    } catch (error) {
      console.error('[RecipeService] getById error:', error);
      return { success: false, error: 'Failed to load recipe' };
    }
  }

  /**
   * Create a new recipe with category and accompanying associations (use admin client)
   */
  async createRecipe(
    supabase: SupabaseClient,
    formData: RecipeFormData
  ): Promise<ServiceResponse<Recipe>> {
    try {
      const {
        course_category_ids,
        cuisine_category_ids,
        dietary_category_ids,
        accompanying_recipe_ids,
        ...rest
      } = formData;
      const recipeData = {
        ...rest,
        rest_periods: cleanRestPeriods(rest.rest_periods),
        ingredient_groups: await linkIngredients(supabase, rest.ingredient_groups),
      };

      // Insert recipe
      const { data: recipe, error } = await supabase
        .from('recipes')
        .insert(recipeData)
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'A recipe with this UID already exists' };
        }
        throw error;
      }

      const recipeId = recipe.id;

      // Insert junction rows
      await this._syncIngredients(supabase, recipeId, recipeData.ingredient_groups);
      await this._syncJunctions(supabase, recipeId, {
        course_category_ids,
        cuisine_category_ids,
        dietary_category_ids,
        accompanying_recipe_ids,
      });

      this.invalidateCache();

      // Return full recipe
      return this.getById(supabase, recipeId);
    } catch (error) {
      console.error('[RecipeService] createRecipe error:', error);
      return { success: false, error: 'Failed to create recipe' };
    }
  }

  /**
   * Update an existing recipe (use admin client)
   */
  async updateRecipe(
    supabase: SupabaseClient,
    id: string,
    formData: RecipeFormData
  ): Promise<ServiceResponse<Recipe>> {
    try {
      const {
        course_category_ids,
        cuisine_category_ids,
        dietary_category_ids,
        accompanying_recipe_ids,
        ...rest
      } = formData;
      const recipeData = {
        ...rest,
        rest_periods: cleanRestPeriods(rest.rest_periods),
        ingredient_groups: await linkIngredients(supabase, rest.ingredient_groups),
      };

      // Update recipe row
      const { error } = await supabase
        .from('recipes')
        .update(recipeData)
        .eq('id', id);

      if (error) throw error;

      // Replace junction rows
      await this._syncIngredients(supabase, id, recipeData.ingredient_groups);
      await this._syncJunctions(supabase, id, {
        course_category_ids,
        cuisine_category_ids,
        dietary_category_ids,
        accompanying_recipe_ids,
      });

      this.invalidateCache();

      return this.getById(supabase, id);
    } catch (error) {
      console.error('[RecipeService] updateRecipe error:', error);
      return { success: false, error: 'Failed to update recipe' };
    }
  }

  /**
   * Delete a recipe (use admin client). CASCADE handles junction cleanup.
   */
  async deleteRecipe(
    supabase: SupabaseClient,
    id: string
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.invalidateCache();
      return { success: true, data: null };
    } catch (error) {
      console.error('[RecipeService] deleteRecipe error:', error);
      return { success: false, error: 'Failed to delete recipe' };
    }
  }

  /**
   * Every "goes well with" link, for pairing dishes into a meal
   */
  async getPairingRows(
    supabase: SupabaseClient
  ): Promise<ServiceResponse<{ recipe_id: string; accompanying_id: string }[]>> {
    try {
      const { data, error } = await supabase.from('recipe_accompanying').select('recipe_id, accompanying_id');
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('[RecipeService] getPairingRows error:', error);
      return { success: false, error: 'Failed to load pairings' };
    }
  }

  /**
   * Get all recipe UIDs (for static generation / sitemap)
   */
  async getAllUids(
    supabase: SupabaseClient
  ): Promise<ServiceResponse<{ uid: string }[]>> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('uid')
        .order('published_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data as { uid: string }[] };
    } catch (error) {
      console.error('[RecipeService] getAllUids error:', error);
      return { success: false, error: 'Failed to load recipe UIDs' };
    }
  }

  /** Keep recipe_ingredients in step with the library links in the ingredient list */
  private async _syncIngredients(supabase: SupabaseClient, recipeId: string, groups: Recipe['ingredient_groups']): Promise<void> {
    const ids = [...new Set(groups.flatMap((g) => g.items.map((i) => i.ingredient_id).filter((id): id is string => !!id)))];
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    if (ids.length) {
      await supabase.from('recipe_ingredients').insert(ids.map((ingredient_id) => ({ recipe_id: recipeId, ingredient_id })));
    }
  }

  /**
   * Delete/reinsert junction rows for categories and accompanying recipes.
   * This "replace all" strategy is simpler and atomic for small sets.
   */
  private async _syncJunctions(
    supabase: SupabaseClient,
    recipeId: string,
    ids: {
      course_category_ids: string[];
      cuisine_category_ids: string[];
      dietary_category_ids: string[];
      accompanying_recipe_ids: string[];
    }
  ): Promise<void> {
    // Categories — delete all then reinsert
    await supabase.from('recipe_categories').delete().eq('recipe_id', recipeId);

    const allCategoryIds = [
      ...ids.course_category_ids,
      ...ids.cuisine_category_ids,
      ...ids.dietary_category_ids,
    ];

    if (allCategoryIds.length > 0) {
      await supabase.from('recipe_categories').insert(
        allCategoryIds.map((categoryId) => ({ recipe_id: recipeId, category_id: categoryId }))
      );
    }

    // Accompanying recipes — delete all then reinsert
    await supabase.from('recipe_accompanying').delete().eq('recipe_id', recipeId);

    if (ids.accompanying_recipe_ids.length > 0) {
      await supabase.from('recipe_accompanying').insert(
        ids.accompanying_recipe_ids.map((accompanyingId) => ({
          recipe_id: recipeId,
          accompanying_id: accompanyingId,
        }))
      );
    }
  }
}

export const RecipeService = new RecipeServiceClass();
export default RecipeService;

/**
 * Give every ingredient line a library link: lines the editor picked keep
 * theirs; typed names are matched to an entry by name or other name. Lines
 * that match nothing are left unlinked (the admin Ingredients page lists them).
 */
async function linkIngredients(supabase: SupabaseClient, groups: Recipe['ingredient_groups']): Promise<Recipe['ingredient_groups']> {
  const unlinked = [...new Set(groups.flatMap((g) => g.items.filter((i) => !i.ingredient_id && i.name?.trim()).map((i) => i.name.trim())))];
  if (!unlinked.length) return groups;

  const keyFor = (name: string) => [name.toLowerCase(), parseIngredientName(name).core].filter(Boolean);
  const keys = [...new Set(unlinked.flatMap(keyFor))];
  const [{ data: byAlias }, { data: byName }] = await Promise.all([
    supabase.from('ingredient_aliases').select('alias, ingredient_id').in('alias', keys),
    supabase.from('ingredients').select('id, name'),
  ]);
  const lookup = new Map<string, string>((byAlias || []).map((a) => [a.alias as string, a.ingredient_id as string]));
  for (const i of byName || []) lookup.set((i.name as string).toLowerCase(), i.id as string);

  return groups.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      if (item.ingredient_id || !item.name?.trim()) return item;
      const id = keyFor(item.name.trim()).map((k) => lookup.get(k)).find(Boolean);
      return id ? { ...item, ingredient_id: id } : item;
    }),
  }));
}
