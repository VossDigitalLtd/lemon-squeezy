import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemonsqueezy.co.uk';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  const { data: recipes } = await supabase
    .from('recipes')
    .select('uid, updated_at')
    .order('updated_at', { ascending: false });

  const recipeEntries: MetadataRoute.Sitemap = (recipes || []).map((r) => ({
    url: `${SITE_URL}/${r.uid}`,
    lastModified: r.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/recipes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/what-we-having`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...recipeEntries,
  ];
}
