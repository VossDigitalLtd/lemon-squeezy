'use client';

import { useState } from 'react';
import { linkStep, type MethodLinks, type methodTerms } from '@/lib/methodLinks';
import { splitStepDurations } from '@/lib/time';
import { StepTimer } from '@/components/recipe/StepTimer';
import { cn } from '@/utils/cn';

interface MethodStepTextProps {
  step: string;
  terms: ReturnType<typeof methodTerms>;
  links: MethodLinks;
  /** ["200 g"], or ["4 tsp paprika", "1 tsp cumin"] for several; empty when there's no amount */
  amountFor: (ingredientIds: string[]) => string[];
  /** Show every amount without tapping */
  showAll: boolean;
  /** Tap a time to start a timer (the recipe page); off for previews */
  timers?: boolean;
}

/**
 * One method step, with the ingredients it mentions. Tapping an ingredient
 * shows how much of it the recipe uses, at the chosen servings.
 */
export function MethodStepText({ step, terms, links, amountFor, showAll, timers = true }: MethodStepTextProps) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  let n = 0;
  // With every amount showing, each ingredient's amount appears once per step
  const shownOnce = new Set<string>();

  const linked = (text: string) =>
    linkStep(text, terms, links).map((part) => {
      const i = n++;
      const amounts = part.ingredientIds ? amountFor(part.ingredientIds) : [];
      if (!amounts.length) return <span key={i}>{part.text}</span>;
      const several = amounts.length > 1;
      const key = part.ingredientIds!.join('+');
      const shown = open.has(i) || (showAll && !shownOnce.has(key));
      if (showAll) shownOnce.add(key);
      return (
        // One amount stays on the line with its word; a list of several wraps
        <span key={i} className={cn(!several && 'whitespace-nowrap')}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => {
                const next = new Set(o);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              });
            }}
            aria-expanded={shown}
            title={shown ? undefined : amounts.join(' · ')}
            className="whitespace-normal rounded-sm underline decoration-primary decoration-dotted decoration-2 underline-offset-[5px] hover:decoration-solid focus-visible:outline-2 focus-visible:outline-ring"
          >
            {part.text}
          </button>
          {shown &&
            (several ? (
              <span className="ml-1.5 rounded-lg bg-brand-muted box-decoration-clone px-2 py-px text-[0.8em] font-semibold leading-[2.1] tabular-nums text-foreground">
                {amounts.map((a, ai) => (
                  <span key={ai}>
                    {ai > 0 && <span className="px-1 text-muted-foreground" aria-hidden="true">·</span>}
                    <span className="whitespace-nowrap">{a}</span>{' '}
                  </span>
                ))}
              </span>
            ) : (
              <span className="ml-1.5 inline-block rounded-full bg-brand-muted px-2 align-[0.1em] text-[0.8em] font-semibold leading-relaxed tabular-nums text-foreground">
                {amounts[0]}
              </span>
            ))}
        </span>
      );
    });

  return (
    <>
      {splitStepDurations(step).map((seg, si) =>
        seg.type === 'timer' && timers ? (
          <StepTimer key={`t${si}`} minutes={seg.minutes} label={seg.text} />
        ) : (
          <span key={`s${si}`} className={cn(seg.type === 'timer' && 'font-semibold')}>
            {linked(seg.text)}
          </span>
        )
      )}
    </>
  );
}
