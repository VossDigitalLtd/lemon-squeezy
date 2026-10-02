import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { RecipeService } from '@/lib/supabase/services';
import { LogoMark, LogoTimer, LaceBand } from '@/components/brand';
import { getImageUrl, textToHtml } from '@/lib/recipes';
import { displayIngredient, formatAmount } from '@/lib/units';
import { formatMinutesLong, formatMinutesShort } from '@/lib/time';
import { restNoun, describeRests } from '@/lib/rest';
import { PrintToolbar } from './PrintToolbar';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ uid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { uid } = await params;
  const result = await RecipeService.getByUid(await createClient(), uid);
  // The title becomes the PDF's suggested file name
  return { title: result.data ? `${result.data.title} · Lemon Squeezy` : 'Recipe', robots: { index: false } };
}

/**
 * Branded, A4-friendly version of a recipe for printing or "Save as PDF".
 * ?servings=6&units=imperial carry over the choices made on the recipe page.
 */
export default async function PrintRecipePage({ params, searchParams }: PageProps) {
  const [{ uid }, query] = await Promise.all([params, searchParams]);
  const result = await RecipeService.getByUid(await createClient(), uid);
  if (!result.success || !result.data) notFound();
  const recipe = result.data;

  const base = recipe.servings || 1;
  const requested = parseInt(String(query.servings ?? ''), 10);
  const servings = Number.isInteger(requested) && requested >= 1 && requested <= 48 ? requested : base;
  const system = query.units === 'imperial' ? 'imperial' : 'metric';
  const imageUrl = getImageUrl(recipe.feature_image_path);
  const categories = [...recipe.course_categories, ...recipe.cuisine_categories, ...recipe.dietary_categories].map((c) => c.title);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  // Steps are numbered continuously across method groups
  const stepOffsets = recipe.method_groups.map((_, gi) =>
    recipe.method_groups.slice(0, gi).reduce((sum, g) => sum + g.items.length, 0)
  );

  return (
    <div className="print-recipe min-h-screen bg-muted/40 py-8 print:bg-white print:py-0">
      <PrintToolbar uid={recipe.uid} servings={servings} baseServings={base} system={system} />

      <article className="mx-auto max-w-[210mm] bg-white p-[14mm] text-[#111] shadow-card print:max-w-none print:p-0 print:shadow-none">
        {/* Masthead */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={40} className="text-[#111]" />
            <div className="leading-none">
              <p className="font-display text-[22px]">LemonSqueezy</p>
              <p className="text-[9px] font-semibold">NE1forSeconds</p>
            </div>
          </div>
          {siteUrl && <p className="text-right text-[10px] text-[#555]">{`${siteUrl.replace(/^https?:\/\//, '')}/${recipe.uid}`}</p>}
        </header>
        <LaceBand className="mt-3 text-[#e8d77a]" />

        {/* Title block */}
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-6">
          <div className="min-w-0">
            <h1 className="font-display text-[34px] leading-[1.05]">{recipe.title}</h1>
            {recipe.subtitle && <p className="mt-1 font-display text-[16px] italic text-[#555]">{recipe.subtitle}</p>}
            {recipe.short_description && <p className="mt-3 text-[12.5px] leading-relaxed">{recipe.short_description}</p>}
            {categories.length > 0 && <p className="mt-2 text-[10.5px] uppercase tracking-[0.1em] text-[#666]">{categories.join(' · ')}</p>}
            {recipe.rest_periods.length > 0 && recipe.total_time != null && (
              <p className="mt-2 text-[11.5px]">
                <b>Ready in {formatMinutesLong(recipe.total_time)}</b>, including {describeRests(recipe.rest_periods, formatMinutesShort)}.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px]">
              {recipe.prep_time != null && <Fact minutes={recipe.prep_time} label="Prep" />}
              {recipe.cook_time != null && recipe.cook_time > 0 && <Fact minutes={recipe.cook_time} label="Cook" />}
              {recipe.rest_periods.map((rest, i) => (
                <Fact key={i} minutes={rest.minutes} label={restNoun(rest)} />
              ))}
              <div className="flex items-center gap-2">
                <span>
                  <b className="block font-display text-[13px] font-normal">Serves</b>
                  {servings}
                  {servings !== base && <span className="text-[#666]"> (recipe serves {base})</span>}
                </span>
              </div>
              {recipe.calories_per_serving != null && (
                <span>
                  <b className="block font-display text-[13px] font-normal">Calories</b>
                  {recipe.calories_per_serving} per serving
                </span>
              )}
            </div>
          </div>
          {imageUrl && (
            <div className="relative h-[42mm] w-[52mm] overflow-hidden rounded-xl">
              <Image src={imageUrl} alt="" fill sizes="200px" className="object-cover" priority />
            </div>
          )}
        </div>

        {/* Ingredients + method */}
        <div className="mt-7 grid grid-cols-[62mm_minmax(0,1fr)] gap-8">
          <section className="rounded-xl bg-[#FEF9E7] p-4">
            <h2 className="font-display text-[19px]">Ingredients</h2>
            {recipe.ingredient_groups.map((group, gi) => (
              <div key={gi} className="break-inside-avoid">
                {group.group_title && <h3 className="mt-3 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#666]">{group.group_title}</h3>}
                <ul className="mt-2 grid gap-1.5 text-[11.5px] leading-snug">
                  {group.items.map((item, ii) => {
                    const shown = displayIngredient(item, base, servings, system);
                    const amount = formatAmount(shown);
                    return (
                      <li key={ii} className="flex gap-2">
                        <span className="mt-[5px] size-[7px] flex-shrink-0 rounded-full border border-[#999]" aria-hidden="true" />
                        <span>
                          {amount && <b className="font-semibold">{amount} </b>}
                          {shown.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <section>
            <h2 className="font-display text-[19px]">Method</h2>
            {recipe.method_groups.map((group, gi) => (
              <div key={gi}>
                {group.group_title && <h3 className="mt-3 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#666]">{group.group_title}</h3>}
                <ol className="mt-2 grid gap-3">
                  {group.items.map((step, si) => {
                    const stepNumber = stepOffsets[gi] + si + 1;
                    return (
                      <li key={si} className="grid break-inside-avoid grid-cols-[22px_1fr] gap-3 text-[12px] leading-relaxed">
                        <span className="grid size-[22px] place-items-center rounded-full bg-[#FDE74C] text-[11px] font-semibold">{stepNumber}</span>
                        <p>{step}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}

            {(recipe.tips || recipe.serving_suggestions) && (
              <div className="mt-5 grid gap-3 border-t border-[#e5e5e5] pt-4 text-[11.5px] leading-relaxed">
                {recipe.serving_suggestions && (
                  <div className="break-inside-avoid">
                    <h3 className="font-display text-[14px]">Serving suggestions</h3>
                    <div className="mt-1 grid gap-1.5" dangerouslySetInnerHTML={{ __html: textToHtml(recipe.serving_suggestions) }} />
                  </div>
                )}
                {recipe.tips && (
                  <div className="break-inside-avoid">
                    <h3 className="font-display text-[14px]">Tips</h3>
                    <div className="mt-1 grid gap-1.5" dangerouslySetInnerHTML={{ __html: textToHtml(recipe.tips) }} />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="mt-8 flex items-center justify-between border-t border-[#e5e5e5] pt-3 text-[9.5px] text-[#666]">
          <span>Lemon Squeezy · Simple, delicious recipes made easy · Καλή όρεξη</span>
          <span>Brought to you by NE1forSeconds</span>
        </footer>
      </article>
    </div>
  );
}

function Fact({ minutes, label }: { minutes: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <LogoTimer minutes={minutes} label="" className="size-8 text-[#111]" />
      <span>
        <b className="block font-display text-[13px] font-normal">{label}</b>
        {formatMinutesLong(minutes)}
      </span>
    </div>
  );
}
