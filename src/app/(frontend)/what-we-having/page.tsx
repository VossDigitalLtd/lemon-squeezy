import { createClient } from '@/lib/supabase/server';
import { RecipeService } from '@/lib/supabase/services';
import { ShuffleBand } from '@/components/home/ShuffleBand';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What We Having?',
  description: "Can't decide what to cook? Let us pick for you!",
};

export default async function WhatWeHavingPage() {
  const supabase = await createClient();
  const result = await RecipeService.getAll(supabase, { limit: 100 });
  const recipes = result.success ? result.data! : [];

  if (recipes.length === 0) {
    return (
      <p className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">
        No recipes yet. Add some in the admin first.
      </p>
    );
  }

  // The band stretches to fill the page between header and footer
  return <ShuffleBand recipes={recipes} headingLevel="h1" className="flex flex-1 items-center [&>div]:w-full" />;
}
