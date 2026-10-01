import { createClient, createAdminClient } from '@/lib/supabase/server';
import { CategoryService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';
import type { CategoryType } from '@/types/recipe';

const VALID_TYPES: CategoryType[] = ['course', 'cuisine', 'dietary'];

/** GET /api/category — get all categories grouped by type */
export async function GET() {
  try {
    const supabase = await createClient();
    const result = await CategoryService.getAllGrouped(supabase);

    if (!result.success) {
      return apiError(result.error || 'Failed to load categories', 500);
    }

    return ok({ data: result.data });
  } catch (error) {
    console.error('GET /api/category error:', error);
    return apiError('Internal server error', 500);
  }
}

/** POST /api/category — create a new category */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('Authentication required', 401);
    }

    let body: { type: CategoryType; uid?: string; title: string };
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 400);
    }

    if (!body.title?.trim()) {
      return apiError('Title is required', 400);
    }

    if (!VALID_TYPES.includes(body.type)) {
      return apiError(`Type must be one of: ${VALID_TYPES.join(', ')}`, 400);
    }

    const adminClient = createAdminClient();
    const result = await CategoryService.createCategory(adminClient, {
      type: body.type,
      uid: body.uid || '',
      title: body.title,
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to create category', 400);
    }

    return ok({ data: result.data }, 201);
  } catch (error) {
    console.error('POST /api/category error:', error);
    return apiError('Internal server error', 500);
  }
}
