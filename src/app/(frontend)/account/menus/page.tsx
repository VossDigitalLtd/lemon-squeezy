import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarHeart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MealPlanService } from '@/lib/supabase/services';
import { AccountPageHeader, FormError, pillButton } from '@/components/account/AccountUI';
import { AddToListButton } from '@/components/recipe/AddToListButton';
import { DeleteMenuButton } from './DeleteMenuButton';
import { getImageUrl } from '@/lib/recipes';
import { SLOT_LABELS, EMPTY_PICK_FILTERS, type SlotKind, type MealShape, type PickFilters } from '@/lib/mealPicker';
import { whatWeHavingQuery } from '@/lib/whatWeHavingUrl';
import { cn } from '@/utils/cn';
import type { Metadata } from 'next';
import type { MealPlanWithRecipes } from '@/lib/supabase/services/MealPlanService';

export const metadata: Metadata = { title: 'Saved menus' };

/** Link that reopens a saved menu in What We Having? with its options and dishes */
function reopenHref(plan: MealPlanWithRecipes): string {
  const o = plan.options as { filters?: PickFilters; shape?: MealShape; sameCuisine?: boolean; usePairings?: boolean };
  const slots = plan.dishes.map((d) => d.slot);
  const shape: MealShape = o.shape ?? {
    starter: slots.includes('starter'),
    main: slots.includes('main'),
    sides: slots.filter((s) => s.startsWith('side')).length,
    dessert: slots.includes('dessert'),
  };
  const picks: Record<string, string> = {};
  for (const d of plan.dishes) if (plan.recipes[d.recipe_id]) picks[d.slot] = plan.recipes[d.recipe_id].uid;
  return `/what-we-having${whatWeHavingQuery({
    mode: 'meal',
    filters: o.filters ?? EMPTY_PICK_FILTERS,
    shape,
    sameCuisine: !!o.sameCuisine,
    usePairings: o.usePairings ?? true,
    picks,
  })}`;
}

const slotLabel = (slot: string) => {
  const kind = slot.split('-')[0] as SlotKind;
  return SLOT_LABELS[kind] ?? slot;
};

export default async function SavedMenusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const result = user ? await MealPlanService.list(supabase, user.id) : null;

  return (
    <div>
      <AccountPageHeader title="Saved menus" intro="Meals you've planned in What We Having?, ready to cook again." />

      {!result?.success ? (
        <FormError>{result?.error ?? 'Sign in to see your saved menus.'}</FormError>
      ) : result.data!.length === 0 ? (
        <div className="rounded-2xl bg-brand-muted p-8 sm:p-10">
          <CalendarHeart size={32} />
          <p className="mt-4 font-display text-2xl">No saved menus yet</p>
          <p className="mt-2 max-w-md text-muted-foreground">
            Plan a meal in What We Having? and press &ldquo;Save menu&rdquo; to keep it here.
          </p>
          <Link href="/what-we-having?mode=meal" className={cn(pillButton.base, pillButton.primary, 'mt-6')}>
            Plan a meal <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-5">
          {result.data!.map((plan) => {
            const dishes = plan.dishes.filter((d) => plan.recipes[d.recipe_id]);
            return (
              <li key={plan.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 bg-brand-muted px-6 py-4">
                  <div>
                    <h2 className="font-display text-2xl leading-tight">{plan.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Saved {new Date(plan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <DeleteMenuButton id={plan.id} name={plan.name} />
                </div>
                <ol className="divide-y divide-border">
                  {dishes.map((d) => {
                    const r = plan.recipes[d.recipe_id];
                    const img = getImageUrl(r.feature_image_path);
                    return (
                      <li key={d.slot} className="flex items-center gap-4 px-6 py-3">
                        <span className="w-20 flex-shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {slotLabel(d.slot)}
                        </span>
                        <span className="relative size-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          {img && <Image src={img} alt="" fill sizes="48px" className="object-cover" />}
                        </span>
                        <Link href={`/${r.uid}`} className="min-w-0 truncate font-display text-lg hover:underline">
                          {r.title}
                        </Link>
                      </li>
                    );
                  })}
                  {dishes.length < plan.dishes.length && (
                    <li className="px-6 py-3 text-sm text-muted-foreground">Some dishes in this menu have since been removed from the site.</li>
                  )}
                </ol>
                <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
                  <Link href={reopenHref(plan)} className={cn(pillButton.base, pillButton.primary, 'h-10')}>
                    Open in What We Having?
                  </Link>
                  <AddToListButton items={dishes.map((d) => ({ recipe_id: d.recipe_id }))} label="this menu" className="h-10" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
