/**
 * ProfileService - User profile management with Supabase Auth + RLS
 *
 * Handles profile CRUD operations with automatic avatar management.
 * RLS policies ensure users can only access their own profile.
 *
 * Usage:
 *   import { ProfileService } from '@/lib/supabase/services';
 *
 *   // Get current user's profile
 *   const profile = await ProfileService.getProfile(supabase);
 *
 *   // Update profile
 *   await ProfileService.updateProfile(supabase, { full_name: 'John Doe' });
 *
 *   // Update avatar
 *   await ProfileService.updateAvatar(supabase, file);
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseQueryService } from '../core/BaseQueryService';
import { StorageService } from '../storage/StorageService';
import type { ServiceResponse, Profile } from '@/types';

interface ProfileUpdates {
  full_name?: string;
  metadata?: Record<string, unknown>;
}

type UserRole = 'user' | 'editor' | 'admin' | 'super_admin';

class ProfileServiceClass extends BaseQueryService {
  constructor() {
    super('profiles', {
      searchFields: ['full_name', 'email'],
      defaultOrderBy: 'created_at',
      useSoftDelete: false,
      enableCache: false, // Never cache profiles — role is security-relevant and must always be fresh
    });
  }

  /**
   * Get the current user's profile
   */
  async getProfile(supabase: SupabaseClient): Promise<ServiceResponse<Profile>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      return this.findById<Profile>(supabase, user.id);

    } catch (error) {
      console.error('[ProfileService] getProfile error:', error);
      return { success: false, error: 'Failed to get profile' };
    }
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(
    supabase: SupabaseClient,
    updates: ProfileUpdates
  ): Promise<ServiceResponse<Profile>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      // Filter allowed update fields
      const allowedFields: (keyof ProfileUpdates)[] = ['full_name', 'metadata'];
      const safeUpdates: Partial<ProfileUpdates> = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key as keyof ProfileUpdates)) {
          (safeUpdates as Record<string, unknown>)[key] = value;
        }
      }

      if (Object.keys(safeUpdates).length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      // Validate full_name length
      if (typeof safeUpdates.full_name === 'string' && safeUpdates.full_name.length > 100) {
        return { success: false, error: 'Full name must be 100 characters or fewer' };
      }

      // Prevent unbounded metadata payloads (10KB limit)
      if (safeUpdates.metadata !== undefined) {
        if (JSON.stringify(safeUpdates.metadata).length > 10_000) {
          return { success: false, error: 'Metadata exceeds maximum allowed size' };
        }
      }

      // Upsert so a missing profile row is created automatically
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, email: user.email, ...safeUpdates },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        console.error('[ProfileService] updateProfile upsert error:', error);
        return { success: false, error: 'Failed to update profile' };
      }

      return { success: true, data: data as Profile };

    } catch (error) {
      console.error('[ProfileService] updateProfile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  /**
   * Update the current user's avatar
   */
  async updateAvatar(
    supabase: SupabaseClient,
    file: File
  ): Promise<ServiceResponse<Profile>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      // Get current profile to check for existing avatar
      const { data: currentProfile } = await this.getProfile(supabase);

      // Delete old avatar if exists
      if (currentProfile?.avatar_path) {
        await StorageService.deleteFile(supabase, currentProfile.avatar_path);
      }

      // Upload new avatar
      const uploadResult = await StorageService.uploadAvatar(supabase, file);

      if ('error' in uploadResult) {
        return { success: false, error: uploadResult.error };
      }

      // Upsert profile with new avatar URL and path
      const updateResult = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, avatar_url: uploadResult.url, avatar_path: uploadResult.path },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (updateResult.error) {
        // Cleanup uploaded file on failure
        await StorageService.deleteFile(supabase, uploadResult.path);
        return { success: false, error: 'Failed to update profile' };
      }

      return {
        success: true,
        data: updateResult.data as Profile
      };

    } catch (error) {
      console.error('[ProfileService] updateAvatar error:', error);
      return { success: false, error: 'Failed to update avatar' };
    }
  }

  /**
   * Remove the current user's avatar
   */
  async removeAvatar(supabase: SupabaseClient): Promise<ServiceResponse<void>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      // Get current profile
      const { data: currentProfile } = await this.getProfile(supabase);

      // Delete avatar file if exists
      if (currentProfile?.avatar_path) {
        await StorageService.deleteFile(supabase, currentProfile.avatar_path);
      }

      // Clear avatar fields in profile
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          avatar_path: null
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: 'Failed to remove avatar' };
      }

      return { success: true };

    } catch (error) {
      console.error('[ProfileService] removeAvatar error:', error);
      return { success: false, error: 'Failed to remove avatar' };
    }
  }

  /**
   * Check if user has admin role
   */
  async isAdmin(supabase: SupabaseClient): Promise<boolean> {
    try {
      const { success, data } = await this.getProfile(supabase);

      if (!success || !data) {
        return false;
      }

      return ['admin', 'super_admin'].includes(data.role as string);

    } catch {
      return false;
    }
  }

  /**
   * Get user role
   */
  async getRole(supabase: SupabaseClient): Promise<UserRole | null> {
    try {
      const { success, data } = await this.getProfile(supabase);

      if (!success || !data) {
        return null;
      }

      return data.role as UserRole;

    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const ProfileService = new ProfileServiceClass();
export default ProfileService;

// Export types
export type { ProfileUpdates, UserRole };
