/**
 * SettingsService - site-wide settings (one row in site_settings)
 *
 * Read with any client (public read); change with the admin client
 * behind requireStaff. If the settings can't be read, the defaults apply.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/types';

export interface SiteSettings {
  /** Show each recipe's inspiration (its sources) on recipe and print pages */
  show_recipe_inspiration: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  show_recipe_inspiration: true,
};

const SELECT = 'show_recipe_inspiration';

class SettingsServiceClass {
  async get(supabase: SupabaseClient): Promise<SiteSettings> {
    const { data, error } = await supabase.from('site_settings').select(SELECT).maybeSingle();
    if (error || !data) return DEFAULT_SITE_SETTINGS;
    return { ...DEFAULT_SITE_SETTINGS, ...data };
  }

  async update(supabase: SupabaseClient, changes: Partial<SiteSettings>, userId: string): Promise<ServiceResponse<SiteSettings>> {
    const { data, error } = await supabase
      .from('site_settings')
      .upsert({ id: true, ...changes, updated_at: new Date().toISOString(), updated_by: userId })
      .select(SELECT)
      .single();
    if (error || !data) return { success: false, error: error?.message || 'Could not save the settings' };
    return { success: true, data: { ...DEFAULT_SITE_SETTINGS, ...data } };
  }
}

export const SettingsService = new SettingsServiceClass();
