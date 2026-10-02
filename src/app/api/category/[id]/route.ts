import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { CategoryService } from '@/lib/supabase/services';
import type { CategoryUpdate } from '@/lib/supabase/services/CategoryService';
import { ok, apiError } from '@/lib/api/response';

/** Pick and validate the editable fields from a request body */
function parseUpdate(body: Record<string, unknown>): CategoryUpdate | string {
  const update: CategoryUpdate = {};

  if ('title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim()) return 'Title is required';
    update.title = body.title;
  }
  if ('image_path' in body) {
    if (body.image_path !== null && typeof body.image_path !== 'string') return 'image_path must be a string or null';
    update.image_path = body.image_path || null;
  }
  if ('image_alt' in body) {
    if (body.image_alt !== null && typeof body.image_alt !== 'string') return 'image_alt must be a string or null';
    update.image_alt = body.image_alt || null;
  }
  if ('show_on_home' in body) {
    if (typeof body.show_on_home !== 'boolean') return 'show_on_home must be true or false';
    update.show_on_home = body.show_on_home;
  }
  if ('sort_order' in body) {
    if (!Number.isInteger(body.sort_order)) return 'sort_order must be a whole number';
    update.sort_order = body.sort_order as number;
  }

  if (Object.keys(update).length === 0) return 'Nothing to update';
  return update;
}

/** PUT /api/category/[id] — update a category's title, photo or homepage settings */
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request body', 400);
    }

    const update = parseUpdate(body ?? {});
    if (typeof update === 'string') {
      return apiError(update, 400);
    }

    const adminClient = createAdminClient();
    const result = await CategoryService.updateCategory(adminClient, id, update);

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
