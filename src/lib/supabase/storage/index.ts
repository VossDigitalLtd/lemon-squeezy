// lib/supabase/storage/index.ts
export { StorageService, isUploadError } from './StorageService';
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
} from './StorageService';
export { default } from './StorageService';
