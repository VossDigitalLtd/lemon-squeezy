'use client';

import { useEffect, useState } from 'react';
import RecipeForm from '@/components/admin/RecipeForm';
import type { Category } from '@/types/recipe';

export default function NewRecipePage() {
  const [categories, setCategories] = useState<{
    courses: Category[];
    cuisines: Category[];
    dietaries: Category[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/category', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => setCategories(json.data))
      .catch(() => setCategories({ courses: [], cuisines: [], dietaries: [] }));
  }, []);

  if (!categories) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md mb-4" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Recipe</h1>
        <p className="text-sm text-muted-foreground mt-1">Add a new recipe to your collection</p>
      </div>
      <RecipeForm categories={categories} />
    </div>
  );
}
