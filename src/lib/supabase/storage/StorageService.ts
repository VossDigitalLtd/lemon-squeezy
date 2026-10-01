/**
 * StorageService - Unified file upload and management for Supabase Storage
 *
 * Handles file uploads, deletions, and URL generation with proper
 * user-scoped folder structure for RLS compliance.
 *
 * Usage:
 *   import { StorageService } from '@/lib/supabase/storage';
 *   const result = await StorageService.uploadAvatar(supabase, file);
 */

import { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'user-assets';

// Allowed image types — SVG intentionally excluded (can embed scripts, XSS risk on public buckets)
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number];

// Max file sizes (in bytes)
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Result types
interface UploadSuccess {
  url: string;
  path: string;
  bucket: string;
}

interface UploadError {
  error: string;
}

type UploadResult = UploadSuccess | UploadError;

interface DeleteSuccess {
  success: true;
}

interface DeleteError {
  error: string;
}

type DeleteResult = DeleteSuccess | DeleteError;

interface SignedUrlSuccess {
  url: string;
}

type SignedUrlResult = SignedUrlSuccess | UploadError;

interface BulkDeleteSuccess {
  success: true;
  deleted: number;
}

type BulkDeleteResult = BulkDeleteSuccess | UploadError;

interface FileInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  type: string;
  created_at: string;
}

type ListFilesResult = FileInfo[] | UploadError;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface ValidationOptions {
  allowedTypes?: readonly string[];
  maxSize?: number;
}

// Type guards
function isUploadError(result: UploadResult): result is UploadError {
  return 'error' in result;
}

export class StorageService {
  /**
   * Upload an avatar image for the current user
   */
  static async uploadAvatar(
    supabase: SupabaseClient,
    file: File
  ): Promise<UploadResult> {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      return { error: 'Please upload a valid image file (JPEG, PNG, GIF, WebP or SVG)' };
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      return { error: 'Avatar must be smaller than 2MB' };
    }

    return this.uploadFile(supabase, file, 'avatars', user.id);
  }

  /**
   * Upload a general image for the current user
   */
  static async uploadImage(
    supabase: SupabaseClient,
    file: File,
    folder: string = 'images'
  ): Promise<UploadResult> {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Authentication required' };
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      return { error: 'Please upload a valid image file (JPEG, PNG, GIF, WebP or SVG)' };
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: 'Image must be smaller than 5MB' };
    }

    return this.uploadFile(supabase, file, folder, user.id);
  }

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    supabase: SupabaseClient,
    file: File,
    folder: string = 'files',
    userId: string,
    bucket: string = DEFAULT_BUCKET
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${userId}/${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
        bucket: bucket
      };

    } catch (error) {
      console.error('File upload failed:', error);
      return { error: 'Upload failed. Please try again.' };
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(
    supabase: SupabaseClient,
    path: string,
    bucket: string = DEFAULT_BUCKET
  ): Promise<DeleteResult> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return { error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('File deletion failed:', error);
      return { error: 'Deletion failed. Please try again.' };
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(
    supabase: SupabaseClient,
    path: string,
    bucket: string = DEFAULT_BUCKET
  ): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Get signed URL for private files
   */
  static async getSignedUrl(
    supabase: SupabaseClient,
    path: string,
    expiresIn: number = 3600,
    bucket: string = DEFAULT_BUCKET
  ): Promise<SignedUrlResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        return { error: error.message };
      }

      return { url: data.signedUrl };

    } catch (error) {
      console.error('Failed to get signed URL:', error);
      return { error: 'Failed to generate URL' };
    }
  }

  /**
   * List files for the current user
   */
  static async listUserFiles(
    supabase: SupabaseClient,
    folder: string = '',
    bucket: string = DEFAULT_BUCKET
  ): Promise<ListFilesResult> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { error: 'Authentication required' };
      }

      const path = folder ? `${folder}/${user.id}` : user.id;

      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('List files error:', error);
        return { error: error.message };
      }

      // Filter out folders and add URLs
      const files: FileInfo[] = data
        .filter(item => !item.name.endsWith('/') && item.metadata)
        .map(item => {
          const fullPath = `${path}/${item.name}`;
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fullPath);

          return {
            name: item.name,
            path: fullPath,
            url: urlData.publicUrl,
            size: (item.metadata as Record<string, unknown>)?.size as number || 0,
            type: this.getFileType(item.name),
            created_at: item.created_at || ''
          };
        });

      return files;

    } catch (error) {
      console.error('List files failed:', error);
      return { error: 'Failed to list files' };
    }
  }

  /**
   * Bulk delete files
   */
  static async bulkDelete(
    supabase: SupabaseClient,
    paths: string[],
    bucket: string = DEFAULT_BUCKET
  ): Promise<BulkDeleteResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        console.error('Bulk delete error:', error);
        return { error: error.message };
      }

      return {
        success: true,
        deleted: data?.length || 0
      };

    } catch (error) {
      console.error('Bulk delete failed:', error);
      return { error: 'Bulk deletion failed' };
    }
  }

  /**
   * Get file type from filename
   */
  static getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File, options: ValidationOptions = {}): ValidationResult {
    const {
      allowedTypes = ALLOWED_IMAGE_TYPES,
      maxSize = MAX_IMAGE_SIZE
    } = options;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Max size: ${this.formatFileSize(maxSize)}`
      };
    }

    return { valid: true };
  }
}

// Export type guard
export { isUploadError };

// Export types
export type {
  UploadResult,
  UploadSuccess,
  UploadError,
  DeleteResult,
  SignedUrlResult,
  BulkDeleteResult,
  FileInfo,
  ListFilesResult,
  ValidationResult,
  ValidationOptions
};

export default StorageService;
