'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

/** Delete a saved menu, with an inline "are you sure" step */
export function DeleteMenuButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/meal-plans/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) return addToast('Failed to delete the menu', 'error');
    addToast(`Deleted "${name}"`, 'success');
    router.refresh();
  }

  return confirming ? (
    <span className="flex items-center gap-2 text-sm">
      Delete this menu?
      <button type="button" onClick={remove} disabled={busy} className="rounded-full bg-destructive px-3 py-1 font-medium text-white">
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground hover:text-foreground">
        Cancel
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
      aria-label={`Delete ${name}`}
    >
      <Trash2 size={16} />
    </button>
  );
}
