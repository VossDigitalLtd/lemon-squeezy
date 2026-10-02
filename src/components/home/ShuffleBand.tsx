'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shuffle } from 'lucide-react';
import { LogoTimer, LogoRays } from '@/components/brand';
import { getImageUrl } from '@/lib/recipes';
import { formatMinutesShort } from '@/lib/time';
import { cn } from '@/utils/cn';
import type { RecipeSummary } from '@/types/recipe';

/**
 * Yellow "What We Having?" band: picks a random recipe from `recipes`,
 * never the same one twice in a row.
 */
interface ShuffleBandProps {
  recipes: RecipeSummary[];
  className?: string;
  /** Use "h1" when the band is the page itself (/what-we-having) */
  headingLevel?: 'h1' | 'h2';
}

export function ShuffleBand({ recipes, className, headingLevel = 'h2' }: ShuffleBandProps) {
  const Heading = headingLevel;
  const [picked, setPicked] = useState<RecipeSummary | null>(null);

  if (recipes.length === 0) return null;

  function pick() {
    const pool = recipes.length > 1 ? recipes.filter((r) => r.id !== picked?.id) : recipes;
    setPicked(pool[Math.floor(Math.random() * pool.length)]);
  }

  const imageUrl = picked ? getImageUrl(picked.feature_image_path) : null;

  return (
    <section aria-labelledby="shuffle-title" data-flush-bottom className={cn('bg-primary text-primary-foreground', className)}>
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <Heading id="shuffle-title" className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-none">
            What We Having?
          </Heading>
          <p className="mt-3 max-w-md text-[1.0625rem]">Can&rsquo;t decide what to cook? Let us pick for you.</p>
          <button
            type="button"
            onClick={pick}
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary-foreground px-6 font-medium text-primary transition hover:brightness-125 focus-visible:outline-primary-foreground"
          >
            <Shuffle size={17} />
            {picked ? 'Pick Another' : 'Pick a Recipe'}
          </button>
        </div>

        <div aria-live="polite">
          {picked ? (
            <div className="grid grid-cols-1 items-center gap-5 rounded-2xl bg-white p-3.5 text-[oklch(0.145_0_0)] shadow-[0_12px_30px_-12px_oklch(0.3_0.08_95/0.45)] sm:grid-cols-[9rem_1fr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[oklch(0.95_0.02_95)] sm:h-27 sm:w-36 sm:aspect-auto">
                {imageUrl ? (
                  <Image src={imageUrl} alt={picked.feature_image_alt || ''} fill sizes="144px" className="object-cover" />
                ) : (
                  <svg viewBox="0 0 180 180" className="absolute inset-0 m-auto w-1/3 text-[oklch(0.145_0_0)]/30" aria-hidden="true">
                    <LogoRays />
                  </svg>
                )}
              </div>
              <div className="min-w-0 pr-2">
                <h3 className="font-display text-[1.375rem] leading-tight">{picked.title}</h3>
                {picked.total_time ? (
                  <p className="mt-1.5 flex items-center gap-2 text-[0.8125rem] text-[oklch(0.45_0.01_95)] tabular-nums">
                    <LogoTimer minutes={picked.total_time} label="" className="size-7 text-[oklch(0.145_0_0)]" />
                    {formatMinutesShort(picked.total_time)}
                    {picked.course_categories[0] && ` · ${picked.course_categories[0].title}`}
                  </p>
                ) : null}
                <Link href={`/${picked.uid}`} className="mt-2.5 inline-block border-b-2 border-[oklch(0.145_0_0)] text-[0.9375rem] font-medium">
                  View recipe →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid min-h-34 place-items-center rounded-2xl border-2 border-dashed border-primary-foreground/20 bg-white/55 p-6 text-center font-display text-xl italic text-[oklch(0.45_0.01_95)]">
              Tonight&rsquo;s dinner will appear here
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
