/**
 * MediaService — media library management
 *
 * Extends BaseQueryService for pagination/search and delegates uploads to
 * StorageService, keeping all file-handling logic consistent with the rest
 * of the codebase.
 *
 * Copy to: src/lib/supabase/services/MediaService.ts
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseQueryService } from '@/lib/supabase/core';
import { StorageService } from '@/lib/supabase/storage';
import type { MediaItem } from '@/types/types';

// Re-export type so API routes and components can import from one place
export type { MediaItem };

type ServiceSuccess<T> = { success: true; data: T };
type ServiceError = { success: false; error: string };
type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

class MediaServiceClass extends BaseQueryService {
  constructor() {
    super('media_items', {
      searchFields: ['filename', 'alt_text'],
      defaultOrderBy: 'created_at',
      defaultOrderDirection: 'desc',
      enableCache: false, // uploads/deletes invalidate immediately; no caching benefit
    });
  }

  /**
   * Upload a file and create a media_items record.
   *
   * Uses StorageService.uploadImage internally — file type and size validation
   * (JPEG/PNG/GIF/WebP, max 5MB) happens there.
   *
   * Storage path: media/{userId}/{timestamp-random.ext}
   */
  async upload(
    supabase: SupabaseClient,
    file: File
  ): Promise<ServiceResult<MediaItem>> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // uploadImage validates type + size, uploads to storage, returns { url, path }
    const uploadResult = await StorageService.uploadImage(supabase, file, 'media');

    if ('error' in uploadResult) {
      return { success: false, error: uploadResult.error };
    }

    const { data, error } = await supabase
      .from('media_items')
      .insert({
        user_id: user.id,
        filename: file.name,
        storage_path: uploadResult.path,
        url: uploadResult.url,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select()
      .single();

    if (error) {
      // Attempt to clean up the uploaded file if DB insert fails
      await StorageService.deleteFile(supabase, uploadResult.path);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as MediaItem };
  }

  /**
   * Delete a media item — removes the storage object first, then the DB record.
   */
  async remove(
    supabase: SupabaseClient,
    id: string
  ): Promise<ServiceResult<null>> {
    const { data, error: fetchError } = await supabase
      .from('media_items')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !data) {
      return { success: false, error: 'Media item not found' };
    }

    const { storage_path } = data as { storage_path: string };

    const deleteResult = await StorageService.deleteFile(supabase, storage_path);
    if ('error' in deleteResult) {
      return { success: false, error: deleteResult.error };
    }

    const { error: dbError } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true, data: null };
  }

  /**
   * Update the alt text for a media item.
   * Pass an empty string to clear it (stored as NULL).
   */
  async updateAltText(
    supabase: SupabaseClient,
    id: string,
    altText: string
  ): Promise<ServiceResult<MediaItem>> {
    return this.update<MediaItem>(supabase, id, {
      alt_text: altText.trim() || null,
    });
  }
}

export const MediaService = new MediaServiceClass();
