'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import RecipeForm from '@/components/admin/RecipeForm';
import { useToast } from '@/lib/toast/context';
import type { Recipe, Category } from '@/types/recipe';

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [categories, setCategories] = useState<{
    courses: Category[];
    cuisines: Category[];
    dietaries: Category[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/recipe/${id}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/category', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([recipeJson, catJson]) => {
        if (recipeJson.error) {
          setError(recipeJson.error);
          addToast(recipeJson.error, 'error');
          return;
        }
        setRecipe(recipeJson.data);
        setCategories(catJson.data || { courses: [], cuisines: [], dietaries: [] });
      })
      .catch(() => {
        setError('Failed to load recipe');
        addToast('Failed to load recipe', 'error');
      });
  }, [id, addToast]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-destructive/10 text-destructive rounded-xl border border-destructive/20 p-6 text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!recipe || !categories) {
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Edit Recipe</h1>
          <Link
            href={`/${recipe.uid}`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={14} />
            View on site
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{recipe.title}</p>
      </div>
      <RecipeForm recipe={recipe} categories={categories} />
    </div>
  );
}
