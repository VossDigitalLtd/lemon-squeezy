import { createClient } from '@/lib/supabase/server';
import { RecipeService } from '@/lib/supabase/services';
import { getImageUrl } from '@/lib/recipes';
import type { AuthPhoto } from '@/components/auth/AuthShell';

/** Three recent recipe photos for the sign-in panel (empty on any failure) */
export async function getAuthPhotos(): Promise<AuthPhoto[]> {
  try {
    const supabase = await createClient();
    const result = await RecipeService.getAll(supabase, { limit: 3, withImage: true });
    if (!result.success) return [];
    return result.data!.map((r) => ({ url: getImageUrl(r.feature_image_path)!, alt: r.feature_image_alt || r.title }));
  } catch {
    return [];
  }
}
