'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Heart, Link2, Lock, LockOpen, Minus, Plus, RefreshCw, Shuffle, SlidersHorizontal } from 'lucide-react';
import { LogoTimer, LogoRays, LaceBand } from '@/components/brand';
import { FavouriteHeart } from '@/components/recipe/FavouriteHeart';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/useToast';
import { getImageUrl } from '@/lib/recipes';
import { formatMinutesShort } from '@/lib/time';
import {
  buildPairings,
  buildSlots,
  fitsSlot,
  matchesFilters,
  mealTiming,
  pickMeal,
  pickOne,
  EMPTY_PICK_FILTERS,
  SLOT_LABELS,
  type MealSlot,
  type PickFilters,
} from '@/lib/mealPicker';
import { whatWeHavingQuery, DEFAULT_SHAPE, type PickMode, type WhatWeHavingState } from '@/lib/whatWeHavingUrl';
import { cn } from '@/utils/cn';
import type { Category, RecipeSummary } from '@/types/recipe';

const TIMES = [15, 30, 45, 60] as const;
const TIME_LABELS: Record<number, string> = { 15: '15 min', 30: '30 min', 45: '45 min', 60: '1 hour' };

interface Props {
  recipes: RecipeSummary[];
  categories: { courses: Category[]; cuisines: Category[]; dietaries: Category[] };
  pairingRows: { recipe_id: string; accompanying_id: string }[];
  favouriteIds: string[];
  isLoggedIn: boolean;
  initialState: WhatWeHavingState;
}

type Picks = Record<string, RecipeSummary | null>;

export default function WhatWeHavingClient({ recipes, categories, pairingRows, favouriteIds, isLoggedIn, initialState }: Props) {
  const { addToast } = useToast();
  const byUid = useMemo(() => new Map(recipes.map((r) => [r.uid, r])), [recipes]);
  const pairings = useMemo(() => buildPairings(pairingRows), [pairingRows]);
  const favSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  const [mode, setMode] = useState<PickMode>(initialState.mode);
  const [filters, setFilters] = useState<PickFilters>(initialState.filters);
  const [shape, setShape] = useState(initialState.shape);
  const [sameCuisine, setSameCuisine] = useState(initialState.sameCuisine);
  const [usePairings, setUsePairings] = useState(initialState.usePairings);
  const [showOptions, setShowOptions] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [round, setRound] = useState(0); // bumps on each pick so results animate in

  // Restore picks from a shared link
  const [dish, setDish] = useState<RecipeSummary | null>(() =>
    initialState.mode === 'dish' && initialState.picks.dish ? byUid.get(initialState.picks.dish) ?? null : null
  );
  const [meal, setMeal] = useState<Picks | null>(() => {
    if (initialState.mode !== 'meal') return null;
    const entries = Object.entries(initialState.picks);
    return entries.length ? Object.fromEntries(entries.map(([slot, uid]) => [slot, byUid.get(uid) ?? null])) : null;
  });
  const [locked, setLocked] = useState<Set<string>>(() => new Set());

  const slots = useMemo(() => buildSlots(shape), [shape]);

  // Keep the address in step so menus can be shared or bookmarked
  useEffect(() => {
    const picks: Record<string, string> = {};
    if (mode === 'dish' && dish) picks.dish = dish.uid;
    if (mode === 'meal' && meal) {
      for (const s of slots) if (meal[s.id]) picks[s.id] = meal[s.id]!.uid;
    }
    const url = `${window.location.pathname}${whatWeHavingQuery({ mode, filters, shape, sameCuisine, usePairings, picks })}`;
    window.history.replaceState(null, '', url);
  }, [mode, filters, shape, sameCuisine, usePairings, dish, meal, slots]);

  // How many recipes each choice has to work with
  const dishCount = useMemo(() => recipes.filter((r) => matchesFilters(r, filters, favSet)).length, [recipes, filters, favSet]);
  const slotCounts = useMemo(() => {
    const f = { ...filters, course: [] };
    const counts: Record<string, number> = {};
    for (const kind of ['starter', 'main', 'side', 'dessert'] as const) {
      counts[kind] = recipes.filter((r) => fitsSlot(r, kind) && matchesFilters(r, f, favSet)).length;
    }
    return counts;
  }, [recipes, filters, favSet]);

  /** Short "rolling" beat before results land, so a pick feels like a pick */
  function roll(fn: () => void) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      fn();
      setRound((r) => r + 1);
      return;
    }
    setRolling(true);
    window.setTimeout(() => {
      fn();
      setRound((r) => r + 1);
      setRolling(false);
    }, 420);
  }

  function pickDish() {
    roll(() => setDish(pickOne(recipes, filters, favSet, dish?.id)));
  }

  function planMeal(onlySlot?: string) {
    roll(() => {
      const keep: Picks = {};
      for (const s of slots) {
        const isKept = onlySlot ? s.id !== onlySlot : locked.has(s.id);
        if (isKept && meal?.[s.id]) keep[s.id] = meal[s.id];
      }
      setMeal(
        pickMeal({
          recipes,
          slots,
          filters: { ...filters, course: [] },
          favouriteIds: favSet,
          pairings,
          usePairings,
          sameCuisine,
          locked: keep,
          previous: meal ?? undefined,
        })
      );
    });
  }

  function toggleLock(slotId: string) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      addToast('Link copied. Send it to whoever’s cooking.', 'success');
    } catch {
      addToast("Couldn't copy the link. Copy it from the address bar instead.", 'error');
    }
  }

  async function saveAll(dishes: RecipeSummary[]) {
    const results = await Promise.all(
      dishes.map((d) => fetch(`/api/recipe/${d.id}/favourite`, { method: 'PUT' }).then((r) => r.ok).catch(() => false))
    );
    const saved = results.filter(Boolean).length;
    addToast(
      saved === dishes.length ? `Saved ${saved} recipes to your recipe box` : `Saved ${saved} of ${dishes.length}. Try again for the rest.`,
      saved === dishes.length ? 'success' : 'error'
    );
  }

  const activeOptionCount =
    (filters.time ? 1 : 0) + filters.cuisine.length + filters.dietary.length + (filters.fromBox ? 1 : 0) + (mode === 'dish' ? filters.course.length : 0);

  const toggleIn = (key: 'cuisine' | 'dietary' | 'course', uid: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(uid) ? f[key].filter((u) => u !== uid) : [...f[key], uid] }));

  return (
    <div>
      {/* ── Intro ── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-8 lg:pb-12 lg:pt-14">
          <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] leading-none">What We Having?</h1>
          <p className="mt-3 max-w-xl text-[1.0625rem]">
            Can&rsquo;t decide? Tell us what you fancy and we&rsquo;ll pick a dish, or put a whole meal together.
          </p>
          <div role="tablist" aria-label="What to pick" className="mt-7 inline-flex rounded-full bg-primary-foreground/10 p-1">
            {(
              [
                ['dish', 'One dish'],
                ['meal', 'A full meal'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  'rounded-full px-5 py-2 text-[0.9375rem] font-medium transition-colors',
                  mode === value ? 'bg-white text-[oklch(0.145_0_0)] shadow-card' : 'hover:bg-primary-foreground/10'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-14">
        {/* ── Options ── */}
        <aside aria-label="Options">
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            aria-expanded={showOptions}
            aria-controls="www-options"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[0.9375rem] font-medium lg:hidden"
          >
            <SlidersHorizontal size={17} />
            Options{activeOptionCount ? ` (${activeOptionCount})` : ''}
          </button>

          <div id="www-options" className={cn('mt-6 space-y-7 lg:sticky lg:top-24 lg:mt-0 lg:block', !showOptions && 'hidden')}>
            {mode === 'meal' ? (
              <OptionGroup label="On the menu">
                <div className="grid gap-2">
                  {(['starter', 'main'] as const).map((kind) => (
                    <CourseToggle
                      key={kind}
                      label={SLOT_LABELS[kind]}
                      count={slotCounts[kind]}
                      checked={shape[kind]}
                      onChange={(v) => setShape((s) => ({ ...s, [kind]: v }))}
                    />
                  ))}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2">
                    <span>
                      <span className="block font-medium">Sides</span>
                      <span className="block text-xs text-muted-foreground">{slotCounts.side} to choose from</span>
                    </span>
                    <span className="inline-flex items-center gap-1" role="group" aria-label="Number of sides">
                      <StepButton label="Fewer sides" disabled={shape.sides <= 0} onClick={() => setShape((s) => ({ ...s, sides: s.sides - 1 }))}>
                        <Minus size={15} />
                      </StepButton>
                      <output className="w-5 text-center tabular-nums">{shape.sides}</output>
                      <StepButton label="More sides" disabled={shape.sides >= 2} onClick={() => setShape((s) => ({ ...s, sides: s.sides + 1 }))}>
                        <Plus size={15} />
                      </StepButton>
                    </span>
                  </div>
                  <CourseToggle
                    label={SLOT_LABELS.dessert}
                    count={slotCounts.dessert}
                    checked={shape.dessert}
                    onChange={(v) => setShape((s) => ({ ...s, dessert: v }))}
                  />
                </div>
                <div className="mt-4 grid gap-3">
                  <SwitchRow
                    id="pairings"
                    label="Use “goes well with” pairings"
                    hint="Sides and extras that are linked to the main come first."
                    checked={usePairings}
                    onChange={setUsePairings}
                  />
                  <SwitchRow
                    id="same-cuisine"
                    label="Keep to one cuisine"
                    hint="Match the other courses to the main where we can."
                    checked={sameCuisine}
                    onChange={setSameCuisine}
                  />
                </div>
              </OptionGroup>
            ) : (
              categories.courses.length > 0 && (
                <OptionGroup label="Course">
                  <Chip active={filters.course.length === 0} onClick={() => setFilters((f) => ({ ...f, course: [] }))}>
                    Anything
                  </Chip>
                  {categories.courses.map((c) => (
                    <Chip key={c.id} active={filters.course.includes(c.uid)} onClick={() => toggleIn('course', c.uid)}>
                      {c.title}
                    </Chip>
                  ))}
                </OptionGroup>
              )
            )}

            <OptionGroup label={mode === 'meal' ? 'Time for each dish' : 'Time'}>
              <Chip active={!filters.time} onClick={() => setFilters((f) => ({ ...f, time: null }))}>
                Any time
              </Chip>
              {TIMES.map((t) => (
                <Chip key={t} active={filters.time === t} onClick={() => setFilters((f) => ({ ...f, time: f.time === t ? null : t }))}>
                  <LogoTimer minutes={t} label="" className="-ml-1 size-5" />
                  {TIME_LABELS[t]}
                </Chip>
              ))}
            </OptionGroup>

            {categories.cuisines.length > 0 && (
              <OptionGroup label="Cuisine">
                {categories.cuisines.map((c) => (
                  <Chip key={c.id} active={filters.cuisine.includes(c.uid)} onClick={() => toggleIn('cuisine', c.uid)}>
                    {c.title}
                  </Chip>
                ))}
              </OptionGroup>
            )}

            {categories.dietaries.length > 0 && (
              <OptionGroup label="Dietary">
                {categories.dietaries.map((c) => (
                  <Chip key={c.id} active={filters.dietary.includes(c.uid)} onClick={() => toggleIn('dietary', c.uid)}>
                    {c.title}
                  </Chip>
                ))}
              </OptionGroup>
            )}

            {isLoggedIn ? (
              <SwitchRow
                id="from-box"
                label="Only from my recipe box"
                hint={favSet.size ? `${favSet.size} saved recipe${favSet.size === 1 ? '' : 's'}` : 'Save some recipes first'}
                checked={filters.fromBox}
                onChange={(v) => setFilters((f) => ({ ...f, fromBox: v }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link href="/login?next=%2Fwhat-we-having" className="font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4">
                  Sign in
                </Link>{' '}
                to pick only from your recipe box.
              </p>
            )}

            {(activeOptionCount > 0 || (mode === 'meal' && (shape.starter !== DEFAULT_SHAPE.starter || shape.sides !== DEFAULT_SHAPE.sides || shape.dessert !== DEFAULT_SHAPE.dessert || !shape.main))) && (
              <button
                type="button"
                onClick={() => {
                  setFilters(EMPTY_PICK_FILTERS);
                  setShape(DEFAULT_SHAPE);
                  setSameCuisine(false);
                  setUsePairings(true);
                }}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Reset options
              </button>
            )}
          </div>
        </aside>

        {/* ── Result ── */}
        <div className="min-w-0" aria-live="polite">
          {mode === 'dish' ? (
            <DishResult
              key={round}
              dish={dish}
              count={dishCount}
              rolling={rolling}
              onPick={pickDish}
              isLoggedIn={isLoggedIn}
              favSet={favSet}
            />
          ) : (
            <MealResult
              round={round}
              slots={slots}
              meal={meal}
              locked={locked}
              rolling={rolling}
              isLoggedIn={isLoggedIn}
              favSet={favSet}
              onPlan={() => planMeal()}
              onReshuffle={(slotId) => planMeal(slotId)}
              onToggleLock={toggleLock}
              onCopyLink={copyLink}
              onSaveAll={saveAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── One dish ────────────────────────────────────────────────────────────────

function DishResult({
  dish,
  count,
  rolling,
  onPick,
  isLoggedIn,
  favSet,
}: {
  dish: RecipeSummary | null;
  count: number;
  rolling: boolean;
  onPick: () => void;
  isLoggedIn: boolean;
  favSet: Set<string>;
}) {
  const img = dish ? getImageUrl(dish.feature_image_path) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <PickButton rolling={rolling} onClick={onPick} disabled={count === 0}>
          {dish ? 'Pick another' : 'Pick a recipe'}
        </PickButton>
        <p className="text-muted-foreground tabular-nums">
          {count === 0 ? 'Nothing matches these options. Try loosening them.' : `Choosing from ${count} recipe${count === 1 ? '' : 's'}`}
        </p>
      </div>

      {dish ? (
        <article
          className={cn(
            'relative mt-8 grid overflow-hidden rounded-3xl border border-border bg-card animate-in fade-in slide-in-from-bottom-2 duration-300 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
            rolling && 'opacity-40 blur-[2px] transition'
          )}
        >
          <div className="relative aspect-[4/3] bg-muted sm:aspect-auto sm:min-h-80">
            {img ? (
              <Image src={img} alt={dish.feature_image_alt || ''} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            ) : (
              <Placeholder />
            )}
          </div>
          <div className="flex flex-col justify-center p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">How about…</p>
            <h2 className="mt-2 font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-[1.05]">{dish.title}</h2>
            {dish.subtitle && <p className="mt-1.5 font-display text-lg italic text-muted-foreground">{dish.subtitle}</p>}
            {dish.short_description && <p className="mt-4 text-muted-foreground">{dish.short_description}</p>}
            <DishMeta recipe={dish} className="mt-5" />
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={`/${dish.uid}`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition hover:brightness-95"
              >
                Let&rsquo;s cook this <ArrowRight size={17} />
              </Link>
              <FavouriteHeart recipeId={dish.id} recipeTitle={dish.title} initialFavourited={favSet.has(dish.id)} isLoggedIn={isLoggedIn} />
            </div>
          </div>
        </article>
      ) : (
        <EmptyState
          title="Tonight’s dinner will appear here"
          text="Set any options you like, then press the button. Don’t like it? Pick again."
        />
      )}
    </div>
  );
}

// ─── A full meal ─────────────────────────────────────────────────────────────

function MealResult({
  round,
  slots,
  meal,
  locked,
  rolling,
  isLoggedIn,
  favSet,
  onPlan,
  onReshuffle,
  onToggleLock,
  onCopyLink,
  onSaveAll,
}: {
  round: number;
  slots: MealSlot[];
  meal: Picks | null;
  locked: Set<string>;
  rolling: boolean;
  isLoggedIn: boolean;
  favSet: Set<string>;
  onPlan: () => void;
  onReshuffle: (slotId: string) => void;
  onToggleLock: (slotId: string) => void;
  onCopyLink: () => void;
  onSaveAll: (dishes: RecipeSummary[]) => void;
}) {
  const dishes = meal ? slots.map((s) => meal[s.id] ?? null) : [];
  const chosen = dishes.filter((d): d is RecipeSummary => !!d);
  const timing = mealTiming(dishes);
  const sideCount = slots.filter((s) => s.kind === 'side').length;

  if (slots.length === 0) {
    return <EmptyState title="Choose what’s on the menu" text="Switch on at least one course in the options." />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <PickButton rolling={rolling} onClick={onPlan}>
          {meal ? (locked.size ? 'Reshuffle the rest' : 'Plan another meal') : 'Plan my meal'}
        </PickButton>
        {meal && locked.size > 0 && (
          <p className="text-muted-foreground">
            Keeping {locked.size} dish{locked.size === 1 ? '' : 'es'}
          </p>
        )}
      </div>

      {meal ? (
        <article
          key={round}
          className={cn(
            'mt-8 overflow-hidden rounded-3xl border border-border bg-card animate-in fade-in slide-in-from-bottom-2 duration-300',
            rolling && 'opacity-40 blur-[2px] transition'
          )}
        >
          <div className="bg-brand-muted">
            <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5 pt-7 sm:px-8">
              <div>
                <h2 className="font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-none">Tonight&rsquo;s menu</h2>
                {timing != null && (
                  <p className="mt-2 flex items-center gap-2 text-muted-foreground tabular-nums">
                    <LogoTimer minutes={timing} label="" className="size-6" />
                    About {formatMinutesShort(timing)} start to finish
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onCopyLink}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition hover:border-foreground"
                >
                  <Link2 size={16} /> Share menu
                </button>
                {isLoggedIn && chosen.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSaveAll(chosen)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition hover:border-foreground"
                  >
                    <Heart size={16} className="text-red-600 dark:text-red-400" /> Save all
                  </button>
                )}
              </div>
            </div>
            <LaceBand />
          </div>

          <ol className="divide-y divide-border">
            {slots.map((slot) => {
              const r = meal[slot.id] ?? null;
              const isLocked = locked.has(slot.id);
              const label = slot.kind === 'side' && sideCount > 1 ? `Side ${slot.id.split('-')[1]}` : SLOT_LABELS[slot.kind];
              return (
                <li key={slot.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-[6.5rem_1fr_auto] sm:px-8">
                  <p className="col-span-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:col-span-1">{label}</p>

                  {r ? (
                    <Link href={`/${r.uid}`} className="group flex min-w-0 items-center gap-4">
                      <span className="relative size-18 flex-shrink-0 overflow-hidden rounded-xl bg-muted sm:size-20">
                        {getImageUrl(r.feature_image_path) ? (
                          <Image src={getImageUrl(r.feature_image_path)!} alt="" fill sizes="80px" className="object-cover" />
                        ) : (
                          <Placeholder small />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-[1.375rem] leading-tight decoration-primary decoration-[3px] underline-offset-4 group-hover:underline">
                          {r.title}
                        </span>
                        <DishMeta recipe={r} className="mt-1.5" />
                      </span>
                    </Link>
                  ) : (
                    <p className="text-muted-foreground">Nothing fits these options. Try loosening them.</p>
                  )}

                  <div className="flex items-center gap-1">
                    {r && (
                      <FavouriteHeart recipeId={r.id} recipeTitle={r.title} initialFavourited={favSet.has(r.id)} isLoggedIn={isLoggedIn} />
                    )}
                    {r && (
                      <button
                        type="button"
                        onClick={() => onToggleLock(slot.id)}
                        aria-pressed={isLocked}
                        aria-label={isLocked ? `Stop keeping ${r.title}` : `Keep ${r.title} when reshuffling`}
                        title={isLocked ? 'Kept' : 'Keep this one'}
                        className={cn(
                          'grid size-10 place-items-center rounded-full transition-colors',
                          isLocked ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {isLocked ? <Lock size={17} /> : <LockOpen size={17} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onReshuffle(slot.id)}
                      disabled={isLocked}
                      aria-label={`Swap the ${label.toLowerCase()}`}
                      title="Swap this one"
                      className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </article>
      ) : (
        <EmptyState
          title="Your menu will appear here"
          text="Choose the courses, set any options, then press the button. Keep the dishes you like and reshuffle the rest."
        />
      )}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function PickButton({
  rolling,
  onClick,
  disabled,
  children,
}: {
  rolling: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || rolling}
      className="inline-flex h-13 items-center gap-2.5 rounded-full bg-[oklch(0.145_0_0)] px-7 text-[1.0625rem] font-medium text-white transition hover:brightness-125 disabled:opacity-50 dark:bg-primary dark:text-primary-foreground dark:hover:brightness-95"
    >
      <Shuffle size={19} className={cn(rolling && 'animate-spin motion-reduce:animate-none')} />
      {children}
    </button>
  );
}

function DishMeta({ recipe, className }: { recipe: RecipeSummary; className?: string }) {
  const course = recipe.course_categories[0]?.title;
  const cuisine = recipe.cuisine_categories[0]?.title;
  return (
    <span className={cn('flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground tabular-nums', className)}>
      {recipe.total_time ? (
        <>
          <LogoTimer minutes={recipe.total_time} label="" className="size-6" />
          {formatMinutesShort(recipe.total_time)}
        </>
      ) : null}
      {[course, cuisine].filter(Boolean).map((t) => (
        <span key={t} className="flex items-center gap-2">
          <span className="size-[3px] rounded-full bg-current" aria-hidden="true" />
          {t}
        </span>
      ))}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-8 grid place-items-center rounded-3xl border-2 border-dashed border-border px-6 py-16 text-center">
      <svg viewBox="0 0 180 180" className="size-20 text-muted-foreground/50" aria-hidden="true">
        <LogoRays />
      </svg>
      <p className="mt-5 font-display text-2xl italic">{title}</p>
      <p className="mt-2 max-w-md text-muted-foreground">{text}</p>
    </div>
  );
}

function Placeholder({ small }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 180 180" className={cn('absolute inset-0 m-auto text-muted-foreground/40', small ? 'w-1/2' : 'w-1/4')} aria-hidden="true">
      <LogoRays />
    </svg>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</h2>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
        active
          ? 'border-primary bg-primary font-medium text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function CourseToggle({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{count} to choose from</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={`Include a ${label.toLowerCase()}`} />
    </label>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {hint && <span className="block text-[0.8125rem] text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-1" />
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-8 place-items-center rounded-full border border-border hover:border-foreground disabled:opacity-30 disabled:hover:border-border"
    >
      {children}
    </button>
  );
}
