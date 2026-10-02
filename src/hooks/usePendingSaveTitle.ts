'use client';

import { useEffect, useState } from 'react';
import { getPendingSave } from '@/lib/pendingSave';

/** Title of a recipe waiting to be saved after sign-in (read after mount, so no hydration mismatch) */
export function usePendingSaveTitle(): string | null {
  const [title, setTitle] = useState<string | null>(null);
  useEffect(() => {
    setTitle(getPendingSave()?.title ?? null);
  }, []);
  return title;
}
