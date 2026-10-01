import { createClient } from '@/lib/supabase/server';
import { ProfileService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('No file provided', 400);
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return apiError('Invalid file type. Please upload a JPEG, PNG, GIF or WebP image.', 400);
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('File too large. Maximum size is 2MB.', 400);
    }

    const result = await ProfileService.updateAvatar(supabase, file);

    if (!result.success) {
      return apiError(result.error ?? 'Bad request', result.error === 'Authentication required' ? 401 : 400);
    }

    return ok({ data: result.data });
  } catch (error) {
    console.error('POST /api/profile/avatar error:', error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const result = await ProfileService.removeAvatar(supabase);

    if (!result.success) {
      return apiError(result.error ?? 'Bad request', result.error === 'Authentication required' ? 401 : 400);
    }

    return ok({ success: true });
  } catch (error) {
    console.error('DELETE /api/profile/avatar error:', error);
    return apiError('Internal server error', 500);
  }
}
