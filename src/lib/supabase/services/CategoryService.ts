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
        .select('id, type, uid, title')
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
        .select('id, type, uid, title')
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
        .select('id, type, uid, title')
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
    title: string
  ): Promise<ServiceResponse<Category>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ title: title.trim() })
        .eq('id', id)
        .select('id, type, uid, title')
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
