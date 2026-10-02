'use client';

import { useEffect } from 'react';

const REPEAT_WINDOW_MS = 30 * 60 * 1000;

/**
 * Records one view of a recipe for the admin reports. A repeat view of the
 * same recipe in this browser within 30 minutes isn't counted again.
 */
export function RecipeViewTracker({ recipeId }: { recipeId: string }) {
  useEffect(() => {
    const key = `ls-viewed-${recipeId}`;
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last < REPEAT_WINDOW_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Storage blocked: still count the view
    }
    fetch(`/api/recipe/${recipeId}/view`, { method: 'POST', keepalive: true }).catch(() => {});
  }, [recipeId]);

  return null;
}
