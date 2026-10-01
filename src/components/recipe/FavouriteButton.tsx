'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FavouriteButtonProps {
  recipeId: string;
  initialFavourited: boolean;
  /** When not logged in, hide the button entirely */
  isLoggedIn: boolean;
  className?: string;
}

export function FavouriteButton({
  recipeId,
  initialFavourited,
  isLoggedIn,
  className,
}: FavouriteButtonProps) {
  const [isFav, setIsFav] = useState(initialFavourited);
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoggedIn) return null;

  async function handleToggle() {
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
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        isFav
          ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
          : 'bg-card border-border text-muted-foreground hover:border-red-300 hover:text-red-500',
        isLoading && 'opacity-60',
        className
      )}
      aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
    >
      <Heart
        size={16}
        className={cn(
          'transition-all',
          isFav ? 'fill-current' : 'group-hover:scale-110'
        )}
      />
      <span>{isFav ? 'Favourited' : 'Favourite'}</span>
    </button>
  );
}
