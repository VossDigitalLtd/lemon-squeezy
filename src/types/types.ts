// BOLT-ON: media — safe to delete if not using the media library
export interface MediaItem {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  created_at: string;
}
