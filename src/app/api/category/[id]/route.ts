import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { CategoryService } from '@/lib/supabase/services';
import { ok, apiError } from '@/lib/api/response';

/** PUT /api/category/[id] — update a category's title */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('Authentication required', 401);
    }

    let body: { title: string };
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 400);
    }

    if (!body.title?.trim()) {
      return apiError('Title is required', 400);
    }

    const adminClient = createAdminClient();
    const result = await CategoryService.updateCategory(adminClient, id, body.title);

    if (!result.success) {
      return apiError(result.error || 'Failed to update category', 400);
    }

    return ok({ data: result.data });
  } catch (error) {
    console.error('PUT /api/category/[id] error:', error);
    return apiError('Internal server error', 500);
  }
}

/** DELETE /api/category/[id] — delete a category */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return apiError('Authentication required', 401);
    }

    const adminClient = createAdminClient();
    const result = await CategoryService.deleteCategory(adminClient, id);

    if (!result.success) {
      return apiError(result.error || 'Failed to delete category', 400);
    }

    return ok({ success: true });
  } catch (error) {
    console.error('DELETE /api/category/[id] error:', error);
    return apiError('Internal server error', 500);
  }
}
