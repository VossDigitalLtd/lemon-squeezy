'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { RotateCcw, Trash2 } from 'lucide-react';
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
import { getImageUrl } from '@/lib/recipes';
import { TRASH_DAYS, daysLeft, type TrashItem } from '@/lib/trash';

const KIND_LABEL = { recipe: 'Recipe', category: 'Category' } as const;

export default function TrashPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);

  useEffect(() => {
    fetch('/api/admin/trash', { cache: 'no-store' })
      .then((r) => r.json().then((json) => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || 'Failed to load the trash');
        setItems(json.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load the trash'));
  }, []);

  async function act(item: TrashItem, action: 'restore' | 'purge') {
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, kind: item.kind, id: item.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
      addToast(action === 'restore' ? `Restored "${item.title}"` : `Deleted "${item.title}" for good`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally {
      setBusyId(null);
      setPurgeTarget(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Trash</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deleted recipes and categories wait here for {TRASH_DAYS} days before they&rsquo;re deleted for good.
          Restoring one puts it back exactly as it was, with its favourites, categories and pairings.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card divide-y divide-border">
        {error ? (
          <div className="px-4 py-12 text-center text-destructive">{error}</div>
        ) : items === null ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-12 w-12 bg-muted animate-pulse rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-muted animate-pulse rounded-md mb-2" />
                <div className="h-3 w-72 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">The trash is empty.</div>
        ) : (
          items.map((item) => {
            const imageUrl = getImageUrl(item.image_path);
            const left = daysLeft(item.deleted_at);
            return (
              <div key={`${item.kind}-${item.id}`} className="flex items-center gap-4 px-4 py-3">
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {imageUrl ? (
                    <Image src={imageUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                      No img
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {KIND_LABEL[item.kind]}
                    {item.kind === 'category' && ` (${item.detail})`}
                    {' · '}deleted {new Date(item.deleted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' · '}
                    {left === 0 ? 'goes for good today' : `goes for good in ${left} day${left === 1 ? '' : 's'}`}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => act(item, 'restore')} disabled={busyId === item.id}>
                    <RotateCcw size={14} className="mr-1.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPurgeTarget(item)}
                    disabled={busyId === item.id}
                    className="text-destructive hover:text-destructive"
                    title="Delete forever"
                    aria-label={`Delete ${item.title} forever`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={!!purgeTarget} onOpenChange={() => setPurgeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete forever?</DialogTitle>
            <DialogDescription>
              {purgeTarget?.kind === 'recipe'
                ? `"${purgeTarget.title}" will be deleted for good, along with everyone's saves of it, its view counts and any weeks it's scheduled as recipe of the week. This can't be undone.`
                : `"${purgeTarget?.title}" will be deleted for good and taken off every recipe it's on. This can't be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => purgeTarget && act(purgeTarget, 'purge')}
              disabled={!!purgeTarget && busyId === purgeTarget.id}
            >
              {purgeTarget && busyId === purgeTarget.id ? 'Deleting…' : 'Delete forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
