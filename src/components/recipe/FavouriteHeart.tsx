'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FavouriteHeartProps {
  recipeId: string;
  recipeTitle: string;
  initialFavourited: boolean;
}

/**
 * Round heart button for recipe cards (the card's `action` slot).
 * Optimistic: flips straight away, reverts if the request fails.
 */
export function FavouriteHeart({ recipeId, recipeTitle, initialFavourited }: FavouriteHeartProps) {
  const [isFav, setIsFav] = useState(initialFavourited);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    setIsFav((v) => !v);
    try {
      const res = await fetch(`/api/recipe/${recipeId}/favourite`, { method: 'POST' });
      if (!res.ok) setIsFav((v) => !v);
    } catch {
      setIsFav((v) => !v);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={isFav}
      aria-label={isFav ? `Remove ${recipeTitle} from your recipe box` : `Save ${recipeTitle} to your recipe box`}
      className={cn(
        'grid size-10 place-items-center rounded-full bg-card/90 shadow-card backdrop-blur transition-transform hover:scale-110',
        isFav ? 'text-red-600 dark:text-red-400' : 'text-foreground'
      )}
    >
      <Heart size={18} className={cn(isFav && 'fill-current')} />
    </button>
  );
}
