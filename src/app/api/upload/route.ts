import { createClient } from '@/lib/supabase/server';
import { ok, apiError } from '@/lib/api/response';
import { requireStaff } from '@/lib/auth/requireStaff';

const RECIPE_IMAGE_BUCKET = 'recipe-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/** POST /api/upload — upload a recipe image to Supabase Storage */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    // Only editors and admins can change content

    const denied = await requireStaff(supabase);

    if (denied) return denied;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('No file provided', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError('File too large. Maximum size is 5MB.', 400);
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(RECIPE_IMAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '31536000', // 1 year — images are immutable (new upload = new path)
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return apiError('Failed to upload image', 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(RECIPE_IMAGE_BUCKET)
      .getPublicUrl(data.path);

    return ok({
      data: {
        path: data.path,
        url: urlData.publicUrl,
      },
    });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return apiError('Internal server error', 500);
  }
}
