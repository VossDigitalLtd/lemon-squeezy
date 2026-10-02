'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Link2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { parseIngredientName } from '@/lib/ingredientMatch';
import { cn } from '@/utils/cn';
import type { LibraryIngredient } from '@/types/recipe';

interface IngredientPickerProps {
  name: string;
  ingredientId?: string;
  library: LibraryIngredient[];
  onChange: (value: { name: string; ingredient_id?: string }) => void;
  /** Add a new library entry; resolves with it */
  onCreate: (name: string) => Promise<LibraryIngredient | null>;
}

/**
 * Ingredient name for a recipe line, linked to the ingredient library.
 * Typing suggests library entries; picking one links the line. The wording
 * can still be changed ("chicken breasts") without losing the link.
 */
export function IngredientPicker({ name, ingredientId, library, onChange, onCreate }: IngredientPickerProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const linked = ingredientId ? library.find((i) => i.id === ingredientId) : undefined;
  const query = name.trim().toLowerCase();
  const core = useMemo(() => (query ? parseIngredientName(query).core : ''), [query]);

  const suggestions = useMemo(() => {
    if (!query) return [];
    const scored = library
      .map((i) => {
        const n = i.name.toLowerCase();
        const score = n === core || n === query ? 0 : n.startsWith(core || query) ? 1 : n.includes(core || query) ? 2 : n.includes(query) ? 3 : 9;
        return { i, score };
      })
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || (b.i.recipe_count ?? 0) - (a.i.recipe_count ?? 0) || a.i.name.localeCompare(b.i.name));
    return scored.slice(0, 8).map((x) => x.i);
  }, [library, query, core]);

  // Best guess shown when a typed name isn't linked yet
  const exact = !linked && core ? library.find((i) => i.name.toLowerCase() === core) : undefined;

  function pick(entry: LibraryIngredient) {
    // Keep the editor's wording if they typed a fuller version ("chicken breasts"); otherwise use the entry's name
    const keepWording = query && parseIngredientName(query).core === entry.name.toLowerCase();
    onChange({ name: keepWording ? name : entry.name.toLowerCase(), ingredient_id: entry.id });
    setOpen(false);
  }

  async function create() {
    const label = core ? core[0].toUpperCase() + core.slice(1) : name.trim();
    if (!label) return;
    setCreating(true);
    const entry = await onCreate(label);
    setCreating(false);
    if (entry) onChange({ name, ingredient_id: entry.id });
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        value={name}
        onChange={(e) => {
          onChange({ name: e.target.value, ingredient_id: ingredientId });
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (!open || !suggestions.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Ingredient, e.g. chicken breast"
        className="h-8 text-sm"
        role="combobox"
          aria-controls={listId}
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
      />

      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setActive(i)}
                className={cn('flex w-full items-center justify-between px-3 py-1.5 text-left text-sm', i === active && 'bg-muted')}
              >
                {s.name}
                <span className="text-xs text-muted-foreground">{s.recipe_count ? `${s.recipe_count} recipes` : 'new'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* What this line is linked to */}
      <div className="mt-1 flex min-h-5 flex-wrap items-center gap-2 text-xs">
        {linked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-viz-good/12 px-2 py-0.5 text-viz-good">
            <Link2 size={11} /> {linked.name}
            <button type="button" onClick={() => onChange({ name })} aria-label="Unlink from the library" className="ml-0.5 hover:text-foreground">
              <X size={11} />
            </button>
          </span>
        ) : name.trim() ? (
          exact ? (
            <button type="button" onClick={() => pick(exact)} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground hover:border-foreground hover:text-foreground">
              <Link2 size={11} /> Link to {exact.name}
            </button>
          ) : (
            <button
              type="button"
              onClick={create}
              disabled={creating}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-viz-attention/60 px-2 py-0.5 text-viz-attention hover:border-viz-attention"
            >
              <Plus size={11} /> {creating ? 'Adding…' : `Add "${core || name.trim()}" to the library`}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
