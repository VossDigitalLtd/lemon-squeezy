'use client';

import { useState } from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { displayIngredient, formatAmount } from '@/lib/units';
import { splitStepDurations } from '@/lib/time';
import { StepTimer } from '@/components/recipe/StepTimer';
import { cn } from '@/utils/cn';
import type { Recipe } from '@/types/recipe';

interface RecipeContentClientProps {
  recipe: Recipe;
  /** Rendered under the method (tips, serving suggestions) */
  children?: React.ReactNode;
}

export default function RecipeContentClient({ recipe, children }: RecipeContentClientProps) {
  const baseServings = recipe.servings || 1;
  const [servings, setServings] = useState(baseServings);
  const [system, setSystem] = useState<'metric' | 'imperial'>('metric');
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const [doneSteps, setDoneSteps] = useState<Set<string>>(() => new Set());

  function toggle(set: Set<string>, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  // Number steps continuously across method groups
  const stepOffsets = recipe.method_groups.map((_, gi) =>
    recipe.method_groups.slice(0, gi).reduce((sum, g) => sum + g.items.length, 0)
  );

  return (
    <div id="recipe" className="grid scroll-mt-24 grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      {/* ── Ingredients ── */}
      <aside
        aria-labelledby="ingredients-title"
        className="rounded-2xl bg-brand-muted p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto"
      >
        <h2 id="ingredients-title" className="font-display text-[2rem] leading-tight">
          Ingredients
        </h2>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {recipe.servings != null && (
            <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-card" role="group" aria-label="Servings">
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
                className="grid size-9 place-items-center rounded-full hover:bg-muted disabled:opacity-35 disabled:hover:bg-transparent"
                aria-label="Fewer servings"
              >
                <Minus size={16} />
              </button>
              <output className="w-[6.25rem] text-center text-[0.9375rem] tabular-nums" aria-live="polite">
                {servings} serving{servings === 1 ? '' : 's'}
              </output>
              <button
                type="button"
                onClick={() => setServings((s) => Math.min(48, s + 1))}
                className="grid size-9 place-items-center rounded-full hover:bg-muted"
                aria-label="More servings"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          <div className="inline-flex gap-0.5 rounded-full bg-card p-1 shadow-card" role="group" aria-label="Units">
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
        </div>

        {recipe.ingredient_groups.map((group, gi) => (
          <div key={gi}>
            {group.group_title && (
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.group_title}
              </h3>
            )}
            <ul className="mt-3 divide-y divide-lace">
              {group.items.map((item, ii) => {
                const key = `${gi}-${ii}`;
                const shown = displayIngredient(item, baseServings, servings, system);
                const qty = formatAmount(shown);
                const isTicked = ticked.has(key);

                return (
                  <li key={key}>
                    {/* Quantity has its own fixed-width column, so changing servings or
                        units never rewraps the name and the panel keeps its height */}
                    <label className="grid cursor-pointer grid-cols-[auto_5.75rem_minmax(0,1fr)] items-baseline gap-x-3 py-3">
                      <input
                        type="checkbox"
                        checked={isTicked}
                        onChange={() => setTicked((t) => toggle(t, key))}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'grid size-[1.15rem] flex-shrink-0 translate-y-[0.2rem] place-items-center rounded-full border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                          isTicked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground bg-card'
                        )}
                        aria-hidden="true"
                      >
                        {isTicked && <Check size={11} strokeWidth={3} />}
                      </span>
                      {qty && (
                        <span className={cn('font-semibold tabular-nums', isTicked && 'text-muted-foreground line-through')}>
                          {qty}
                        </span>
                      )}
                      {/* No quantity (e.g. "Salt and pepper") never changes, so the name can use the space */}
                      <span className={cn(!qty && 'col-span-2', isTicked && 'text-muted-foreground line-through')}>
                        {shown.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <p className="mt-4 text-[0.8125rem] text-muted-foreground">Tap an ingredient to tick it off.</p>
      </aside>

      {/* ── Method ── */}
      <section aria-labelledby="method-title" className="min-w-0">
        <h2 id="method-title" className="font-display text-[2rem] leading-tight">
          Method
        </h2>

        {recipe.method_groups.map((group, gi) => (
          <div key={gi}>
            {group.group_title && (
              <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.group_title}
              </h3>
            )}
            <ol className="mt-5 grid gap-2">
              {group.items.map((step, si) => {
                const key = `${gi}-${si}`;
                const done = doneSteps.has(key);
                const n = stepOffsets[gi] + si + 1;

                return (
                  <li
                    key={key}
                    onClick={() => setDoneSteps((d) => toggle(d, key))}
                    className={cn(
                      '-mx-5 grid cursor-pointer grid-cols-[auto_1fr] gap-5 rounded-2xl p-5 transition-[background-color,opacity] hover:bg-muted/60',
                      done && 'opacity-45'
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDoneSteps((d) => toggle(d, key));
                      }}
                      aria-pressed={done}
                      aria-label={`Step ${n}: mark as ${done ? 'not done' : 'done'}`}
                      className={cn(
                        'grid size-10 place-items-center rounded-full font-semibold',
                        done ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                      )}
                    >
                      {done ? <Check size={18} /> : n}
                    </button>
                    <p className="min-w-0 text-lg leading-[1.7]">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Step {n}
                      </span>
                      {splitStepDurations(step).map((seg, i) =>
                        seg.type === 'timer' ? (
                          <StepTimer key={i} minutes={seg.minutes} label={seg.text} />
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}

        <p className="mt-4 text-sm text-muted-foreground">Tap a step when it&rsquo;s done. Tap a time to start a timer.</p>

        {children}
      </section>
    </div>
  );
}
