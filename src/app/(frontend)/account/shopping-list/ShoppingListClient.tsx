'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ClipboardCopy, Minus, Plus, Printer, ShoppingBasket, Trash2, X } from 'lucide-react';
import { AccountPageHeader, FormError, pillButton } from '@/components/account/AccountUI';
import { LogoMark } from '@/components/brand';
import { useToast } from '@/hooks/useToast';
import { getImageUrl } from '@/lib/recipes';
import { combineIngredients, formatLine, listAsText, type ListRecipe } from '@/lib/shoppingList';
import type { ShoppingListDoc } from '@/lib/supabase/services/ShoppingListService';
import { cn } from '@/utils/cn';

export default function ShoppingListClient() {
  const { addToast } = useToast();
  const [doc, setDoc] = useState<ShoppingListDoc | null>(null);
  const [recipes, setRecipes] = useState<ListRecipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [system, setSystem] = useState<'metric' | 'imperial'>('metric');
  const [newItem, setNewItem] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/shopping-list', { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Failed to load your shopping list');
        setDoc(json.data.list);
        setRecipes(json.data.recipes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load your shopping list'));
  }, []);

  /** Update locally straight away; save shortly after the last change */
  const update = useCallback(
    (fn: (d: ShoppingListDoc) => ShoppingListDoc) => {
      setDoc((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          fetch('/api/shopping-list', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
            .then((r) => {
              if (!r.ok) throw new Error();
            })
            .catch(() => addToast("Couldn't save your list. Check your connection.", 'error'));
        }, 500);
        return next;
      });
    },
    [addToast]
  );

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const entries = useMemo(
    () => (doc?.recipes ?? []).filter((r) => byId.has(r.recipe_id)).map((r) => ({ recipe: byId.get(r.recipe_id)!, servings: r.servings })),
    [doc, byId]
  );
  const lines = useMemo(() => combineIngredients(entries), [entries]);
  const checked = useMemo(() => new Set(doc?.checked ?? []), [doc]);
  const toBuy = lines.filter((l) => !checked.has(l.key));
  const inBasket = lines.filter((l) => checked.has(l.key));
  const extras = doc?.extras ?? [];
  const isEmpty = entries.length === 0 && extras.length === 0;

  const toggleLine = (key: string) =>
    update((d) => ({ ...d, checked: d.checked.includes(key) ? d.checked.filter((k) => k !== key) : [...d.checked, key] }));

  async function copyList() {
    try {
      await navigator.clipboard.writeText(listAsText(lines, extras, checked, system));
      addToast('Copied. Paste it into a message or your notes.', 'success');
    } catch {
      addToast("Couldn't copy. Try printing instead.", 'error');
    }
  }

  if (error) {
    return (
      <div>
        <AccountPageHeader title="Shopping list" />
        <FormError>{error}</FormError>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="grid h-60 place-items-center" aria-busy="true">
        <span className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="shopping-list">
      {/* Printed heading (screen has the page header instead) */}
      <div className="mb-6 hidden items-center gap-3 border-b border-border pb-4 print:flex">
        <LogoMark size={40} />
        <div>
          <p className="font-display text-2xl leading-none">Shopping list</p>
          <p className="mt-1 text-xs text-muted-foreground">Lemon Squeezy · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="print:hidden">
        <AccountPageHeader
          title="Shopping list"
          intro={
            entries.length
              ? `Everything you need for ${entries.length} recipe${entries.length === 1 ? '' : 's'}, added up. Tick things off as you shop.`
              : 'Add recipes from any recipe page or a meal plan and the ingredients are combined here.'
          }
        />
      </div>

      {isEmpty ? (
        <div className="rounded-2xl bg-brand-muted p-8 sm:p-10">
          <ShoppingBasket size={32} />
          <p className="mt-4 font-display text-2xl">Your list is empty</p>
          <p className="mt-2 max-w-md text-muted-foreground">
            Press &ldquo;Add to shopping list&rdquo; on a recipe, or plan a meal in What We Having? and add the whole menu.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/recipes" className={cn(pillButton.base, pillButton.primary)}>
              Browse recipes
            </Link>
            <Link href="/what-we-having?mode=meal" className={cn(pillButton.base, pillButton.outline)}>
              Plan a meal
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-10">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="inline-flex gap-0.5 rounded-full bg-muted p-1" role="group" aria-label="Units">
              {(['metric', 'imperial'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSystem(s)}
                  aria-pressed={system === s}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors',
                    system === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" onClick={copyList} className={cn(pillButton.base, pillButton.outline, 'h-10')}>
              <ClipboardCopy size={16} /> Copy
            </button>
            <button type="button" onClick={() => window.print()} className={cn(pillButton.base, pillButton.outline, 'h-10')}>
              <Printer size={16} /> Print or save as PDF
            </button>
            {inBasket.length + extras.filter((e) => e.checked).length > 0 && (
              <button
                type="button"
                onClick={() => update((d) => ({ ...d, checked: [], extras: d.extras.filter((e) => !e.checked) }))}
                className={cn(pillButton.base, pillButton.ghost, 'h-10')}
              >
                Clear ticked
              </button>
            )}
            {confirmClear ? (
              <span className="inline-flex items-center gap-2 text-sm">
                Empty the whole list?
                <button
                  type="button"
                  onClick={() => {
                    update(() => ({ recipes: [], checked: [], extras: [] }));
                    setConfirmClear(false);
                  }}
                  className={cn(pillButton.base, pillButton.danger, 'h-9 px-4')}
                >
                  Empty it
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className="text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} className={cn(pillButton.base, pillButton.ghost, 'h-10 text-muted-foreground')}>
                <Trash2 size={16} /> Empty list
              </button>
            )}
          </div>

          {/* Recipes on the list */}
          {entries.length > 0 && (
            <section aria-labelledby="list-recipes" className="print:hidden">
              <h2 id="list-recipes" className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recipes on your list
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {entries.map(({ recipe, servings }) => {
                  const img = getImageUrl(recipe.feature_image_path ?? null);
                  return (
                    <li key={recipe.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
                      <span className="relative size-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {img && <Image src={img} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <Link href={`/${recipe.uid}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                        {recipe.title}
                      </Link>
                      <span className="inline-flex items-center gap-1" role="group" aria-label={`Servings of ${recipe.title}`}>
                        <Stepper
                          label="Fewer servings"
                          disabled={servings <= 1}
                          onClick={() => update((d) => ({ ...d, recipes: d.recipes.map((r) => (r.recipe_id === recipe.id ? { ...r, servings: r.servings - 1 } : r)) }))}
                        >
                          <Minus size={14} />
                        </Stepper>
                        <span className="w-14 text-center text-sm tabular-nums">{servings} srv</span>
                        <Stepper
                          label="More servings"
                          disabled={servings >= 48}
                          onClick={() => update((d) => ({ ...d, recipes: d.recipes.map((r) => (r.recipe_id === recipe.id ? { ...r, servings: r.servings + 1 } : r)) }))}
                        >
                          <Plus size={14} />
                        </Stepper>
                      </span>
                      <button
                        type="button"
                        onClick={() => update((d) => ({ ...d, recipes: d.recipes.filter((r) => r.recipe_id !== recipe.id) }))}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Take ${recipe.title} off the list`}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Combined ingredients */}
          <section aria-labelledby="to-buy">
            <h2 id="to-buy" className="mb-3 font-display text-2xl">
              To buy <span className="font-sans text-base text-muted-foreground tabular-nums">({toBuy.length + extras.filter((e) => !e.checked).length})</span>
            </h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-4 print:border-0 print:px-0">
              {toBuy.map((line) => (
                <ListRow key={line.key} checked={false} onToggle={() => toggleLine(line.key)} {...formatLine(line, system)} note={line.recipes.join(', ')} />
              ))}
              {extras
                .filter((e) => !e.checked)
                .map((e) => (
                  <ListRow
                    key={e.id}
                    checked={false}
                    onToggle={() => update((d) => ({ ...d, extras: d.extras.map((x) => (x.id === e.id ? { ...x, checked: true } : x)) }))}
                    amount=""
                    name={e.text}
                    note="Your item"
                    onRemove={() => update((d) => ({ ...d, extras: d.extras.filter((x) => x.id !== e.id) }))}
                  />
                ))}
              {/* Add your own */}
              <li className="py-2 print:hidden">
                <form
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    const text = newItem.trim();
                    if (!text) return;
                    update((d) => ({ ...d, extras: [...d.extras, { id: crypto.randomUUID(), text, checked: false }] }));
                    setNewItem('');
                  }}
                  className="flex items-center gap-3"
                >
                  <Plus size={18} className="ml-0.5 text-muted-foreground" />
                  <input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add your own item, e.g. kitchen roll"
                    aria-label="Add your own item"
                    maxLength={200}
                    className="h-10 flex-1 bg-transparent text-[0.9375rem] placeholder:text-muted-foreground focus:outline-none"
                  />
                  {newItem.trim() && (
                    <button type="submit" className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4">
                      Add
                    </button>
                  )}
                </form>
              </li>
            </ul>
          </section>

          {/* Ticked */}
          {inBasket.length + extras.filter((e) => e.checked).length > 0 && (
            <section aria-labelledby="in-basket" className="print:hidden">
              <h2 id="in-basket" className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                In the basket
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-muted/40 px-4">
                {inBasket.map((line) => (
                  <ListRow key={line.key} checked onToggle={() => toggleLine(line.key)} {...formatLine(line, system)} />
                ))}
                {extras
                  .filter((e) => e.checked)
                  .map((e) => (
                    <ListRow
                      key={e.id}
                      checked
                      onToggle={() => update((d) => ({ ...d, extras: d.extras.map((x) => (x.id === e.id ? { ...x, checked: false } : x)) }))}
                      amount=""
                      name={e.text}
                    />
                  ))}
              </ul>
            </section>
          )}

          <p className="hidden text-xs text-muted-foreground print:block">
            For: {entries.map((e) => `${e.recipe.title} (${e.servings})`).join(' · ')}
          </p>
        </div>
      )}
    </div>
  );
}

function ListRow({
  checked,
  onToggle,
  amount,
  name,
  note,
  onRemove,
}: {
  checked: boolean;
  onToggle: () => void;
  amount: string;
  name: string;
  note?: string;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5 print:break-inside-avoid print:py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        aria-label={checked ? `Put ${name} back on the list` : `Tick off ${name}`}
        className={cn(
          'grid size-6 flex-shrink-0 place-items-center rounded-full border-[1.5px] transition-colors print:size-4 print:rounded-sm',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground bg-card hover:border-foreground'
        )}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </button>
      <span className={cn('grid min-w-0 flex-1 grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-x-3', checked && 'text-muted-foreground line-through')}>
        {amount && <span className="font-semibold tabular-nums">{amount}</span>}
        {/* Items without an amount use the amount column too */}
        <span className={cn('min-w-0', !amount && 'col-span-2')}>
          {name}
          {note && <span className="ml-2 text-[0.8125rem] text-muted-foreground no-underline print:hidden">{note}</span>}
        </span>
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground print:hidden"
          aria-label={`Remove ${name}`}
        >
          <X size={15} />
        </button>
      )}
    </li>
  );
}

function Stepper({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-7 place-items-center rounded-full border border-border hover:border-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
