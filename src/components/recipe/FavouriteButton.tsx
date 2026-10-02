'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SaveRecipeDialog } from './SaveRecipeDialog';

interface FavouriteButtonProps {
  recipeId: string;
  initialFavourited: boolean;
  /** Signed out: the button still shows, and explains how to save */
  isLoggedIn: boolean;
  /** Used in the "save to your recipe box" prompt for signed-out visitors */
  recipeTitle: string;
  className?: string;
}

export function FavouriteButton({
  recipeId,
  initialFavourited,
  isLoggedIn,
  recipeTitle,
  className,
}: FavouriteButtonProps) {
  const [isFav, setIsFav] = useState(initialFavourited);
  const [isLoading, setIsLoading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  async function handleToggle() {
    if (!isLoggedIn) {
      setPromptOpen(true);
      return;
    }
    setIsLoading(true);
    setIsFav((prev) => !prev); // optimistic

    try {
      const res = await fetch(`/api/recipe/${recipeId}/favourite`, {
        method: 'POST',
      });

      if (!res.ok) {
        setIsFav((prev) => !prev); // revert
      }
    } catch {
      setIsFav((prev) => !prev); // revert
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'group inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[0.9375rem] font-medium transition-colors',
        isFav
          ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
          : 'bg-card border-border text-foreground hover:border-red-300 hover:text-red-500',
        isLoading && 'opacity-60',
        className
      )}
      aria-pressed={isLoggedIn ? isFav : undefined}
      aria-label={isFav ? 'Remove from your recipe box' : 'Save to your recipe box'}
    >
      <Heart
        size={17}
        className={cn(
          'transition-all',
          isFav ? 'fill-current' : 'group-hover:scale-110'
        )}
      />
      <span>{isFav ? 'Saved' : 'Save'}</span>
    </button>
    {!isLoggedIn && (
      <SaveRecipeDialog open={promptOpen} onOpenChange={setPromptOpen} recipeId={recipeId} recipeTitle={recipeTitle} />
    )}
    </>
  );
}
