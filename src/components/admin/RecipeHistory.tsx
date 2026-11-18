'use client';

import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/lib/toast/context';
import type { RecipeRevision } from '@/lib/supabase/services/RevisionService';

const SOURCE_LABEL = { admin: 'Admin', chatgpt: 'ChatGPT' } as const;

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * A recipe's changes, newest first. Each keeps the recipe as it was before
 * that change; restoring one undoes it and everything after it.
 */
export function RecipeHistory({ recipeId }: { recipeId: string }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<RecipeRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<RecipeRevision | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open || revisions) return;
    fetch(`/api/recipe/${recipeId}/revisions`, { cache: 'no-store' })
      .then((r) => r.json().then((json) => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || 'Failed to load the history');
        setRevisions(json.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load the history'));
  }, [open, revisions, recipeId]);

  async function restore() {
    if (!target) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/recipe/${recipeId}/revisions/${target.id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to restore');
      addToast('Recipe restored', 'success');
      // The editor holds its own copy of the recipe, so start it afresh
      window.location.reload();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to restore', 'error');
      setRestoring(false);
      setTarget(null);
    }
  }

  return (
    <div className="mt-6 bg-card rounded-xl border border-border shadow-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every save, from here or from ChatGPT. Restore puts the recipe back as it was before a change.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <History size={14} className="mr-1.5" />
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>

      {open && (
        <div className="mt-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : revisions === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded yet. Changes are kept from the next save onwards.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {revisions.map((rev) => (
                <li key={rev.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{rev.summary || 'Saved'}</p>
                    <p className="text-xs text-muted-foreground">
                      {when(rev.created_at)} · {SOURCE_LABEL[rev.source]}
                      {rev.changed_by_name && ` · ${rev.changed_by_name}`}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(rev)} title="Restore the version from before this change">
                    <RotateCcw size={14} className="mr-1.5" />
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={() => !restoring && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this version?</DialogTitle>
            <DialogDescription>
              The recipe goes back to how it was before the change on {target && when(target.created_at)}, which also undoes any
              changes after it. The current version is kept in History, so you can undo this too.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button onClick={restore} disabled={restoring}>
              {restoring ? 'Restoring…' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
