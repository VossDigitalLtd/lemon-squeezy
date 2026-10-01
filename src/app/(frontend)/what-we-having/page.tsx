import { createClient } from '@/lib/supabase/server';
import { RecipeService } from '@/lib/supabase/services';
import RandomRecipeClient from './RandomRecipeClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What We Having?',
  description: "Can't decide what to cook? Let us pick for you!",
};

export default async function WhatWeHavingPage() {
  const supabase = await createClient();
  const result = await RecipeService.getAll(supabase, { limit: 100 });
  const recipes = result.success ? result.data! : [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
      <h1 className="text-3xl font-bold text-foreground mb-2">What We Having?</h1>
      <p className="text-muted-foreground mb-8">
        Can&apos;t decide what to cook? Let us pick for you!
      </p>
      <RandomRecipeClient recipes={recipes} />
    </div>
  );
}
