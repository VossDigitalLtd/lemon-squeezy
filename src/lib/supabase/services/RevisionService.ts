/**
 * RevisionService - undo history for recipes (migration 033)
 *
 * RecipeService.updateRecipe records the recipe as it was before each save.
 * Restoring a revision saves its snapshot again, which itself records a
 * revision, so a restore can be undone too. Service role only.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/types';
import type { RecipeFormData } from '@/types/recipe';

export type RevisionSource = 'admin' | 'chatgpt';

/** Who made a change and how, recorded with the copy taken before it */
export interface RevisionMeta {
  source: RevisionSource;
  userId: string | null;
  /** What changed, in a few words */
  summary?: string;
}

export interface RecipeRevision {
  id: string;
  recipe_id: string;
  source: RevisionSource;
  summary: string | null;
  created_at: string;
  /** Name (or email) of the person, when known */
  changed_by_name: string | null;
}

const KEEP_PER_RECIPE = 50;

class RevisionServiceClass {
  /**
   * Keep a copy of the recipe before a change. Never throws: a missing
   * history mustn't stop a save (e.g. before migration 033 is run).
   */
  async record(admin: SupabaseClient, recipeId: string, snapshot: RecipeFormData, meta: RevisionMeta): Promise<void> {
    try {
      const { error } = await admin.from('recipe_revisions').insert({
        recipe_id: recipeId,
        snapshot,
        source: meta.source,
        changed_by: meta.userId,
        summary: meta.summary?.trim().slice(0, 300) || null,
      });
      if (error) throw error;

      // Keep the latest KEEP_PER_RECIPE
      const { data: old } = await admin
        .from('recipe_revisions')
        .select('id')
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: false })
        .range(KEEP_PER_RECIPE, KEEP_PER_RECIPE + 100);
      if (old?.length) await admin.from('recipe_revisions').delete().in('id', old.map((r) => r.id));
    } catch (error) {
      console.error('[RevisionService] record error:', error);
    }
  }

  /** A recipe's revisions, newest first */
  async list(admin: SupabaseClient, recipeId: string): Promise<ServiceResponse<RecipeRevision[]>> {
    const { data, error } = await admin
      .from('recipe_revisions')
      .select('id, recipe_id, source, summary, created_at, changed_by')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[RevisionService] list error:', error);
      return { success: false, error: 'Failed to load the history' };
    }

    const ids = [...new Set((data || []).map((r) => r.changed_by).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: people } = await admin.from('profiles').select('id, full_name, email').in('id', ids);
      for (const p of people || []) names.set(p.id, p.full_name || p.email || '');
    }

    return {
      success: true,
      data: (data || []).map(({ changed_by, ...r }) => ({
        ...r,
        changed_by_name: (changed_by && names.get(changed_by)) || null,
      })),
    };
  }

  /** One revision's snapshot, checked to belong to the recipe */
  async get(admin: SupabaseClient, recipeId: string, revisionId: string): Promise<ServiceResponse<{ snapshot: RecipeFormData; created_at: string }>> {
    const { data, error } = await admin
      .from('recipe_revisions')
      .select('snapshot, created_at')
      .eq('id', revisionId)
      .eq('recipe_id', recipeId)
      .maybeSingle();
    if (error || !data) return { success: false, error: 'That version no longer exists' };
    return { success: true, data: data as { snapshot: RecipeFormData; created_at: string } };
  }
}

export const RevisionService = new RevisionServiceClass();
export default RevisionService;
