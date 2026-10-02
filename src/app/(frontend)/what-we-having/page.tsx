import { createClient } from '@/lib/supabase/server';
import { RecipeService, CategoryService, FavouriteService } from '@/lib/supabase/services';
import { parseWhatWeHaving } from '@/lib/whatWeHavingUrl';
import WhatWeHavingClient from './WhatWeHavingClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What We Having?',
  description: "Can't decide what to cook? Let us pick a dish, or a whole meal, for you.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WhatWeHavingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const [recipesResult, categoriesResult, pairingsResult, userResult, params] = await Promise.all([
    RecipeService.getAll(supabase, { limit: 100 }),
    CategoryService.getAllGrouped(supabase),
    RecipeService.getPairingRows(supabase),
    supabase.auth.getUser(),
    searchParams,
  ]);

  const user = userResult.data?.user;
  const favResult = user ? await FavouriteService.getUserFavouriteIds(supabase, user.id) : null;

  return (
    <WhatWeHavingClient
      recipes={recipesResult.success ? recipesResult.data! : []}
      categories={categoriesResult.success ? categoriesResult.data! : { courses: [], cuisines: [], dietaries: [] }}
      pairingRows={pairingsResult.success ? pairingsResult.data! : []}
      favouriteIds={favResult?.success ? favResult.data! : []}
      isLoggedIn={!!user}
      initialState={parseWhatWeHaving(params)}
    />
  );
}
