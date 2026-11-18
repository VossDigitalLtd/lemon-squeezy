/**
 * TrashService - deleted recipes and categories
 *
 * Deleting sets deleted_at (see migration 032); the public read policies
 * hide those rows. Everything here needs the service role (admin client),
 * since only it can see what's in the trash.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RecipeService } from './RecipeService';
import { CategoryService } from './CategoryService';
import { TRASH_DAYS, type TrashItem, type TrashKind } from '@/lib/trash';
import type { ServiceResponse } from '@/types';

const TABLE: Record<TrashKind, 'recipes' | 'categories'> = { recipe: 'recipes', category: 'categories' };

class TrashServiceClass {
  /** Everything in the trash, most recently deleted first (clears out expired items first) */
  async list(admin: SupabaseClient): Promise<ServiceResponse<TrashItem[]>> {
    await this.purgeExpired(admin);
    const [recipes, categories] = await Promise.all([
      admin.from('recipes').select('id, uid, title, feature_image_path, deleted_at').not('deleted_at', 'is', null),
      admin.from('categories').select('id, type, title, image_path, deleted_at').not('deleted_at', 'is', null),
    ]);
    if (recipes.error || categories.error) {
      console.error('[TrashService] list error:', recipes.error || categories.error);
      return { success: false, error: 'Failed to load the trash' };
    }
    const items: TrashItem[] = [
      ...(recipes.data || []).map((r) => ({
        kind: 'recipe' as const,
        id: r.id,
        title: r.title,
        detail: r.uid,
        image_path: r.feature_image_path,
        deleted_at: r.deleted_at,
      })),
      ...(categories.data || []).map((c) => ({
        kind: 'category' as const,
        id: c.id,
        title: c.title,
        detail: c.type,
        image_path: c.image_path,
        deleted_at: c.deleted_at,
      })),
    ];
    items.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
    return { success: true, data: items };
  }

  /** Take an item out of the trash, as it was */
  async restore(admin: SupabaseClient, kind: TrashKind, id: string): Promise<ServiceResponse<null>> {
    const { data, error } = await admin
      .from(TABLE[kind])
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('id');
    if (error) {
      console.error('[TrashService] restore error:', error);
      return { success: false, error: 'Failed to restore' };
    }
    if (!data?.length) return { success: false, error: 'That is no longer in the trash' };
    this.invalidate();
    return { success: true, data: null };
  }

  /**
   * Delete an item for good. Only works on something already in the trash.
   * The database removes what hangs off it (favourites, views, links…).
   */
  async purge(admin: SupabaseClient, kind: TrashKind, id: string): Promise<ServiceResponse<null>> {
    const { error } = await admin.from(TABLE[kind]).delete().eq('id', id).not('deleted_at', 'is', null);
    if (error) {
      console.error('[TrashService] purge error:', error);
      return { success: false, error: 'Failed to delete' };
    }
    this.invalidate();
    return { success: true, data: null };
  }

  /** Delete for good anything that's been in the trash longer than TRASH_DAYS */
  async purgeExpired(admin: SupabaseClient): Promise<void> {
    const cutoff = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const results = await Promise.all([
      admin.from('recipes').delete().lt('deleted_at', cutoff),
      admin.from('categories').delete().lt('deleted_at', cutoff),
    ]);
    for (const { error } of results) if (error) console.error('[TrashService] purgeExpired error:', error);
  }

  private invalidate() {
    RecipeService.invalidateCache();
    CategoryService.invalidateCache();
  }
}

export const TrashService = new TrashServiceClass();
export default TrashService;
