// GDPR DATA EXPORT (Art. 20 — data portability)

import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .single();

  // Favourites
  const { data: favourites } = await supabase
    .from('favourites')
    .select('recipe_id, created_at')
    .eq('user_id', user.id);

  const exportData = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile: profile ?? null,
    favourites: favourites ?? [],
  };

  const filename = `my-data-${new Date().toISOString().split('T')[0]}.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
