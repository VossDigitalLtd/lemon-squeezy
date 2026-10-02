'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SaveRecipeDialog } from './SaveRecipeDialog';

interface FavouriteHeartProps {
  recipeId: string;
  recipeTitle: string;
  initialFavourited: boolean;
  /** Controlled mode: the parent owns the state and the request */
  favourited?: boolean;
  onToggle?: () => void;
  /** Signed out: the heart still shows, and explains how to save */
  isLoggedIn?: boolean;
}

/**
 * Round heart button for recipe cards (the card's `action` slot).
 * Uncontrolled by default: flips straight away, reverts if the request fails.
 * Pass `favourited` + `onToggle` when a parent tracks favourites itself.
 */
export function FavouriteHeart({
  recipeId,
  recipeTitle,
  initialFavourited,
  favourited,
  onToggle,
  isLoggedIn = true,
}: FavouriteHeartProps) {
  const [ownFav, setIsFav] = useState(initialFavourited);
  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const isFav = isLoggedIn && (favourited ?? ownFav);

  async function toggle() {
    if (!isLoggedIn) {
      setPromptOpen(true);
      return;
    }
    if (onToggle) {
      onToggle();
      return;
    }
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
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={isLoggedIn ? isFav : undefined}
        aria-label={isFav ? `Remove ${recipeTitle} from your recipe box` : `Save ${recipeTitle} to your recipe box`}
        className={cn(
          'grid size-10 place-items-center rounded-full bg-card/90 shadow-card backdrop-blur transition-transform hover:scale-110',
          isFav ? 'text-red-600 dark:text-red-400' : 'text-foreground'
        )}
      >
        <Heart size={18} className={cn(isFav && 'fill-current')} />
      </button>
      {!isLoggedIn && (
        <SaveRecipeDialog open={promptOpen} onOpenChange={setPromptOpen} recipeId={recipeId} recipeTitle={recipeTitle} />
      )}
    </>
  );
}
