'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, GitMerge, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/toast/context';
import { AISLES, AISLE_LABELS, type Aisle } from '@/lib/ingredientMatch';
import { cn } from '@/utils/cn';
import type { LibraryIngredient } from '@/types/recipe';

type Show = 'all' | 'unused' | 'staples';

export default function IngredientsAdminPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<LibraryIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [aisle, setAisle] = useState<Aisle | 'all'>('all');
  const [show, setShow] = useState<Show>('all');
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [merging, setMerging] = useState<LibraryIngredient | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/ingredients', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setItems(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!q || i.name.toLowerCase().includes(q)) &&
        (aisle === 'all' || i.category === aisle) &&
        (show === 'all' || (show === 'unused' ? !i.recipe_count : i.is_staple))
    );
  }, [items, query, aisle, show]);

  async function save(id: string, patch: Partial<Pick<LibraryIngredient, 'name' | 'category' | 'is_staple'>>, message: string) {
    const before = items;
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const res = await fetch(`/api/ingredients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok) {
      setItems(before);
      addToast(json.error || 'Failed to save', 'error');
      return false;
    }
    addToast(message, 'success');
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const res = await fetch('/api/ingredients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const json = await res.json();
    if (!res.ok) return addToast(json.error || 'Failed to add', 'error');
    setNewName('');
    if (items.some((i) => i.id === json.data.id)) {
      addToast(`"${json.data.name}" is already in the library`, 'info');
    } else {
      setItems((list) => [...list, { ...json.data, recipe_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      addToast(`Added ${json.data.name}`, 'success');
    }
  }

  async function remove(item: LibraryIngredient) {
    const res = await fetch(`/api/ingredients/${item.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) return addToast(json.error || 'Failed to delete', 'error');
    setItems((list) => list.filter((i) => i.id !== item.id));
    addToast(`Deleted ${item.name}`, 'success');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ingredients</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          One entry per ingredient. Recipes link to these, so shopping lists combine them and visitors can filter recipes by
          ingredient. Merge duplicates (e.g. &ldquo;Chicken fillet&rdquo; into &ldquo;Chicken breast&rdquo;) to tidy up.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}. If the library is new, run migration 029_ingredient_library.sql and the build-ingredient-library script.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ingredients" className="pl-9" aria-label="Search ingredients" />
            </div>
            <Select value={aisle} onValueChange={(v) => setAisle(v as Aisle | 'all')}>
              <SelectTrigger className="w-44" aria-label="Aisle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All aisles</SelectItem>
                {AISLES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {AISLE_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={show} onValueChange={(v) => setShow(v as Show)}>
              <SelectTrigger className="w-40" aria-label="Show">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unused">Not used</SelectItem>
                <SelectItem value="staples">Cupboard staples</SelectItem>
              </SelectContent>
            </Select>
            <form onSubmit={add} className="flex items-center gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New ingredient" className="w-44" aria-label="New ingredient name" />
              <Button type="submit" size="sm" disabled={!newName.trim()}>
                <Plus size={14} /> Add
              </Button>
            </form>
          </div>

          <p className="mb-2 text-sm text-muted-foreground tabular-nums">
            {loading ? 'Loading…' : `${visible.length} of ${items.length} ingredients`}
          </p>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {visible.map((item) => (
                <li key={item.id} className="grid items-center gap-3 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_11rem_7rem_6rem_auto]">
                  {editing?.id === item.id ? (
                    <form
                      className="flex items-center gap-1"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (await save(item.id, { name: editing.name.trim() }, 'Renamed')) setEditing(null);
                      }}
                    >
                      <Input value={editing.name} onChange={(e) => setEditing({ id: item.id, name: e.target.value })} className="h-8" autoFocus aria-label="Ingredient name" />
                      <Button type="submit" variant="ghost" size="sm" aria-label="Save name">
                        <Check size={14} className="text-green-700" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)} aria-label="Cancel">
                        <X size={14} />
                      </Button>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setEditing({ id: item.id, name: item.name })} className="group flex min-w-0 items-center gap-2 text-left">
                      <span className="truncate font-medium">{item.name}</span>
                      <Pencil size={12} className="flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  )}

                  <Select value={item.category} onValueChange={(v) => save(item.id, { category: v as Aisle }, `${item.name}: ${AISLE_LABELS[v as Aisle]}`)}>
                    <SelectTrigger className="h-8 w-full" aria-label={`Aisle for ${item.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AISLES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {AISLE_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground" title="Cupboard staples (salt, oil…) are left out of the ingredient filter">
                    <Switch
                      size="sm"
                      checked={item.is_staple}
                      onCheckedChange={(v) => save(item.id, { is_staple: v }, v ? `${item.name} is a cupboard staple` : `${item.name} isn't a staple`)}
                    />
                    Staple
                  </label>

                  <span className={cn('text-sm tabular-nums', item.recipe_count ? 'text-muted-foreground' : 'text-viz-attention')}>
                    {item.recipe_count ? `${item.recipe_count} recipe${item.recipe_count === 1 ? '' : 's'}` : 'Not used'}
                  </span>

                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMerging(item)} title="Merge into another ingredient">
                      <GitMerge size={14} /> Merge
                    </Button>
                    {!item.recipe_count && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} aria-label={`Delete ${item.name}`}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {merging && (
        <MergeDialog
          from={merging}
          items={items}
          onClose={() => setMerging(null)}
          onMerged={(into, recipes) => {
            setItems((list) =>
              list.filter((i) => i.id !== merging.id).map((i) => (i.id === into.id ? { ...i, recipe_count: (i.recipe_count ?? 0) + (merging.recipe_count ?? 0) } : i))
            );
            addToast(`Merged ${merging.name} into ${into.name} (${recipes} recipe${recipes === 1 ? '' : 's'} updated)`, 'success');
            setMerging(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function MergeDialog({
  from,
  items,
  onClose,
  onMerged,
}: {
  from: LibraryIngredient;
  items: LibraryIngredient[];
  onClose: () => void;
  onMerged: (into: LibraryIngredient, recipes: number) => void;
}) {
  const [query, setQuery] = useState(from.name.split(' ').slice(-1)[0]);
  const [target, setTarget] = useState<LibraryIngredient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = items
    .filter((i) => i.id !== from.id && i.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 30);

  async function merge() {
    if (!target) return;
    setBusy(true);
    setError(null);
    const res = await fetch('/api/ingredients/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from.id, into: target.id }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error || 'Failed to merge');
    onMerged(target, json.data.recipes);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge &ldquo;{from.name}&rdquo;</DialogTitle>
          <DialogDescription>
            Its {from.recipe_count ?? 0} recipe{from.recipe_count === 1 ? '' : 's'} will use the ingredient you choose, and &ldquo;{from.name}&rdquo; becomes
            another name for it.
          </DialogDescription>
        </DialogHeader>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for the ingredient to keep" autoFocus aria-label="Search" />
        <ul className="max-h-64 divide-y divide-border overflow-auto rounded-md border border-border">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setTarget(o)}
                className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted', target?.id === o.id && 'bg-brand-muted font-medium')}
              >
                {o.name}
                <span className="text-xs text-muted-foreground">{o.recipe_count ?? 0} recipes</span>
              </button>
            </li>
          ))}
          {options.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>}
        </ul>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={merge} disabled={!target || busy}>
            {busy ? 'Merging…' : target ? `Merge into ${target.name}` : 'Choose an ingredient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
