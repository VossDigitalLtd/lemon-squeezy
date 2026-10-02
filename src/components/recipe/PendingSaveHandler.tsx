'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth';
import { useToast } from '@/hooks/useToast';
import { getPendingSave, clearPendingSave } from '@/lib/pendingSave';

/**
 * Finishes a save that started while signed out: once someone is signed in,
 * saves the remembered recipe, confirms it, and refreshes so hearts update.
 */
export function PendingSaveHandler() {
  const { user, isLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (isLoading || !user || done.current) return;
    const pending = getPendingSave();
    if (!pending) return;
    done.current = true;

    fetch(`/api/recipe/${pending.recipeId}/favourite`, { method: 'PUT' })
      .then((res) => {
        if (!res.ok) throw new Error();
        clearPendingSave();
        addToast(`Saved ${pending.title} to your recipe box`, 'success');
        router.refresh();
      })
      .catch(() => {
        done.current = false;
        addToast(`We couldn't save ${pending.title}. Tap the heart to try again.`, 'error');
        clearPendingSave();
      });
  }, [user, isLoading, addToast, router]);

  return null;
}
