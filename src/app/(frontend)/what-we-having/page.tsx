import { createClient, getUserId } from '@/lib/supabase/server';
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
  // Checked locally, so the user's favourites load alongside everything else
  const userId = await getUserId(supabase);
  const [recipesResult, categoriesResult, pairingsResult, favResult, params] = await Promise.all([
    RecipeService.getAll(supabase, { limit: 100 }),
    CategoryService.getAllGrouped(supabase),
    RecipeService.getPairingRows(supabase),
    userId ? FavouriteService.getUserFavouriteIds(supabase, userId) : null,
    searchParams,
  ]);

  return (
    <WhatWeHavingClient
      recipes={recipesResult.success ? recipesResult.data! : []}
      categories={categoriesResult.success ? categoriesResult.data! : { courses: [], cuisines: [], dietaries: [] }}
      pairingRows={pairingsResult.success ? pairingsResult.data! : []}
      favouriteIds={favResult?.success ? favResult.data! : []}
      isLoggedIn={!!userId}
      initialState={parseWhatWeHaving(params)}
    />
  );
}
