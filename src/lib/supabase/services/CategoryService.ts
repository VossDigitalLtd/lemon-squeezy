/**
 * CategoryService - Recipe category management
 *
 * Manages course, cuisine, and dietary categories for recipes.
 * Public read, admin writes via service role (RLS).
 *
 * Usage:
 *   import { CategoryService } from '@/lib/supabase/services';
 *
 *   const result = await CategoryService.getAllGrouped(supabase);
 *   await CategoryService.create(adminClient, { type: 'course', uid: 'main', title: 'Main Course' });
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseQueryService } from '../core/BaseQueryService';
import type { ServiceResponse } from '@/types';
import type { Category, CategoryType } from '@/types/recipe';

interface CategoryInput {
  type: CategoryType;
  uid: string;
  title: string;
}

/** Editable fields on an existing category */
export interface CategoryUpdate {
  title?: string;
  image_path?: string | null;
  image_alt?: string | null;
  show_on_home?: boolean;
  sort_order?: number;
}

const CATEGORY_SELECT = 'id, type, uid, title, image_path, image_alt, show_on_home, sort_order';

class CategoryServiceClass extends BaseQueryService {
  constructor() {
    super('categories', {
      searchFields: ['title'],
      defaultOrderBy: 'title',
      defaultOrderDirection: 'asc',
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      useSoftDelete: false,
    });
  }

  /**
   * Get all categories grouped by type
   */
  async getAllGrouped(
    supabase: SupabaseClient
  ): Promise<ServiceResponse<{ courses: Category[]; cuisines: Category[]; dietaries: Category[] }>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(CATEGORY_SELECT)
        .order('title', { ascending: true });

      if (error) throw error;

      const categories = (data || []) as Category[];

      return {
        success: true,
        data: {
          courses: categories.filter((c) => c.type === 'course'),
          cuisines: categories.filter((c) => c.type === 'cuisine'),
          dietaries: categories.filter((c) => c.type === 'dietary'),
        },
      };
    } catch (error) {
      console.error('[CategoryService] getAllGrouped error:', error);
      return { success: false, error: 'Failed to load categories' };
    }
  }

  /**
   * Get categories by type
   */
  async getByType(
    supabase: SupabaseClient,
    type: CategoryType
  ): Promise<ServiceResponse<Category[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(CATEGORY_SELECT)
        .eq('type', type)
        .order('title', { ascending: true });

      if (error) throw error;

      return { success: true, data: (data || []) as Category[] };
    } catch (error) {
      console.error('[CategoryService] getByType error:', error);
      return { success: false, error: 'Failed to load categories' };
    }
  }

  /**
   * Categories flagged for the homepage rail, in sort order. Categories
   * without their own photo borrow the newest recipe photo in that category.
   */
  async getHomeCategories(
    supabase: SupabaseClient
  ): Promise<ServiceResponse<Category[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(CATEGORY_SELECT)
        .eq('show_on_home', true)
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;

      const categories = await Promise.all(
        ((data || []) as Category[]).map(async (cat) => {
          if (cat.image_path) return cat;

          const { data: fallback } = await supabase
            .from('recipes')
            .select('feature_image_path, feature_image_alt, recipe_categories!inner(category_id)')
            .eq('recipe_categories.category_id', cat.id)
            .not('feature_image_path', 'is', null)
            .order('published_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return fallback
            ? { ...cat, image_path: fallback.feature_image_path, image_alt: fallback.feature_image_alt }
            : cat;
        })
      );

      return { success: true, data: categories };
    } catch (error) {
      console.error('[CategoryService] getHomeCategories error:', error);
      return { success: false, error: 'Failed to load categories' };
    }
  }

  /**
   * Create a new category (use admin client)
   */
  async createCategory(
    supabase: SupabaseClient,
    input: CategoryInput
  ): Promise<ServiceResponse<Category>> {
    try {
      const uid = input.uid || input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data, error } = await supabase
        .from('categories')
        .insert({ type: input.type, uid, title: input.title.trim() })
        .select(CATEGORY_SELECT)
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'A category with this name already exists' };
        }
        throw error;
      }

      this.invalidateCache();
      return { success: true, data: data as Category };
    } catch (error) {
      console.error('[CategoryService] createCategory error:', error);
      return { success: false, error: 'Failed to create category' };
    }
  }

  /**
   * Update a category (use admin client)
   */
  async updateCategory(
    supabase: SupabaseClient,
    id: string,
    updates: CategoryUpdate
  ): Promise<ServiceResponse<Category>> {
    try {
      const patch: CategoryUpdate = { ...updates };
      if (patch.title !== undefined) patch.title = patch.title.trim();

      const { data, error } = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id)
        .select(CATEGORY_SELECT)
        .single();

      if (error) throw error;

      this.invalidateCache();
      return { success: true, data: data as Category };
    } catch (error) {
      console.error('[CategoryService] updateCategory error:', error);
      return { success: false, error: 'Failed to update category' };
    }
  }

  /**
   * Delete a category (use admin client). CASCADE removes junction rows.
   */
  async deleteCategory(
    supabase: SupabaseClient,
    id: string
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.invalidateCache();
      return { success: true, data: null };
    } catch (error) {
      console.error('[CategoryService] deleteCategory error:', error);
      return { success: false, error: 'Failed to delete category' };
    }
  }
}

export const CategoryService = new CategoryServiceClass();
export default CategoryService;
