import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ExternalLink, Heart, Pencil, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isStaffRole } from '@/lib/auth/roles';
import { loadReport } from '@/lib/reportsData';
import { SLOT_LABELS, type SlotKind } from '@/lib/mealPicker';
import { cn } from '@/utils/cn';
import type { Bucket } from '@/lib/reports';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  // Reports read across all users, so check the viewer is staff on the server too
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Fadmin%2Freports');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!isStaffRole(profile?.role)) redirect('/');

  const report = await loadReport();
  const { members, saves, health, coverage, featured } = report;
  const healthPct = health.total ? Math.round((health.complete / health.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-muted-foreground">How people are using Lemon Squeezy, and what the recipes need next.</p>
      </div>

      {/* ── Headline numbers ── */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Recipes" value={health.total} sub={coverage.added30 ? `${coverage.added30} added in the last 30 days` : 'None added in the last 30 days'} />
        <Stat label="Saved recipes" value={saves.total} sub={`${saves.last30} in the last 30 days`} />
        <Stat label="Members" value={members.members} sub={`${members.new30} joined in the last 30 days`} />
        <Stat label="Recipes complete" value={`${healthPct}%`} sub={`${health.complete} of ${health.total} have everything`} />
      </div>

      {/* ── Saves ── */}
      <Section
        icon={<Heart size={18} className="text-red-600 dark:text-red-400" />}
        title="Saves"
        intro={`${saves.savers} ${saves.savers === 1 ? 'person has' : 'people have'} saved recipes to their recipe box.`}
      >
        {saves.total === 0 ? (
          <Empty>Nothing saved yet. Saves appear here as people tap the heart on recipes.</Empty>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Saves per week" note="Last 12 weeks">
              <ColumnChart buckets={saves.byWeek} unit="save" />
            </Card>
            <Card title="Most saved recipes">
              <ol className="grid gap-2.5">
                {saves.top.map(({ recipe, count }, i) => (
                  <li key={recipe.id} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                    <Link href={`/${recipe.uid}`} className="truncate font-medium hover:underline">
                      {recipe.title}
                    </Link>
                    <span className="tabular-nums text-muted-foreground">
                      {count} {count === 1 ? 'save' : 'saves'}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
            {saves.byCourse.length > 0 && (
              <Card title="Saves by course">
                <BarList buckets={saves.byCourse.slice(0, 8)} unit="save" />
              </Card>
            )}
            {saves.byCuisine.length > 0 && (
              <Card title="Saves by cuisine">
                <BarList buckets={saves.byCuisine.slice(0, 8)} unit="save" />
              </Card>
            )}
          </div>
        )}
      </Section>

      {/* ── Members ── */}
      <Section
        icon={<Users size={18} />}
        title="Members"
        intro={`${members.active30} of ${members.total} accounts signed in during the last 30 days. ${members.staff} ${members.staff === 1 ? 'is' : 'are'} editors or admins.`}
      >
        <Card title="New sign-ups per month" note="Last 12 months">
          <ColumnChart buckets={members.byMonth} unit="sign-up" />
        </Card>
      </Section>

      {/* ── Recipe health ── */}
      <Section
        icon={health.issues.length ? <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" /> : <CheckCircle2 size={18} className="text-green-700 dark:text-green-400" />}
        title="Recipe to-do list"
        intro="Gaps that affect how recipes look and how the filters and meal planner can use them. Open a list to edit each recipe."
      >
        {health.issues.length === 0 ? (
          <Empty>Every recipe has a photo, times, a course, a cuisine, a description and pairings.</Empty>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
            {health.issues.map((issue) => {
              const pct = Math.round((issue.recipes.length / health.total) * 100);
              return (
                <details key={issue.key} className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-muted/50 [&::-webkit-details-marker]:hidden sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                    <span className="min-w-0">
                      <span className="block font-medium">{issue.label}</span>
                      <span className="block text-sm text-muted-foreground">{issue.why}</span>
                    </span>
                    <span className="hidden h-2 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
                      <span className="block h-full rounded-full bg-amber-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </span>
                    <span className="text-right text-sm tabular-nums">
                      <span className="font-semibold">{issue.recipes.length}</span>
                      <span className="text-muted-foreground"> recipe{issue.recipes.length === 1 ? '' : 's'}</span>
                    </span>
                  </summary>
                  <ul className="grid gap-1 bg-muted/30 px-5 pb-4 pt-2 sm:grid-cols-2">
                    {issue.recipes.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-card">
                        <span className="truncate">{r.title}</span>
                        <span className="flex flex-shrink-0 items-center gap-1">
                          <Link href={`/admin/recipe/${r.id}/edit`} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium hover:bg-muted" aria-label={`Edit ${r.title}`}>
                            <Pencil size={13} /> Edit
                          </Link>
                          <Link href={`/${r.uid}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`View ${r.title} on the site`}>
                            <ExternalLink size={13} />
                          </Link>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Coverage ── */}
      <Section title="What's in the collection" intro="Where there's plenty to choose from, and where there's room for more.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Meal planner choices" note="Recipes that can fill each course in What We Having?">
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(coverage.slots) as SlotKind[]).map((kind) => {
                const n = coverage.slots[kind];
                const low = n < 5;
                return (
                  <div key={kind} className={cn('rounded-lg border p-3', low ? 'border-amber-500/50 bg-amber-500/5' : 'border-border')}>
                    <p className="text-sm text-muted-foreground">{SLOT_LABELS[kind]}s</p>
                    <p className="text-2xl font-bold tabular-nums">{n}</p>
                    {low && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={12} /> Few to choose from
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Recipes by total time">
            <BarList buckets={coverage.timeBands} unit="recipe" />
          </Card>
          <Card title="Recipes by course">
            <BarList buckets={coverage.courses} unit="recipe" />
          </Card>
          <Card title="Recipe of the week">
            {featured.current ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Now: </span>
                <Link href={`/${featured.current.uid}`} className="font-medium hover:underline">
                  {featured.current.title}
                </Link>
                <span className="text-muted-foreground"> (since {formatDate(featured.current.featured_from!)})</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing set, so the homepage features the newest recipe with a photo. Set a date under Publishing on any recipe.
              </p>
            )}
            {featured.upcoming.length > 0 ? (
              <ul className="mt-3 grid gap-1.5 text-sm">
                {featured.upcoming.map(({ recipe, from }) => (
                  <li key={recipe.id} className="flex justify-between gap-4">
                    <Link href={`/admin/recipe/${recipe.id}/edit`} className="truncate hover:underline">
                      {recipe.title}
                    </Link>
                    <span className="flex-shrink-0 tabular-nums text-muted-foreground">from {formatDate(from)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nothing scheduled after that.</p>
            )}
          </Card>
        </div>
      </Section>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Section({ icon, title, intro, children }: { icon?: React.ReactNode; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {intro && <p className="mb-4 mt-1 text-sm text-muted-foreground">{intro}</p>}
      {children}
    </section>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

const plural = (n: number, unit: string) => `${n.toLocaleString()} ${unit}${n === 1 ? '' : 's'}`;

/**
 * Vertical bars over time (one series, so no legend). Hover or focus a bar
 * for its value; the table underneath gives the same numbers.
 */
function ColumnChart({ buckets, unit }: { buckets: Bucket[]; unit: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max];

  return (
    <figure>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        {/* y-axis */}
        <div className="relative h-40 w-6 text-right text-[11px] tabular-nums text-muted-foreground" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(t / max) * 100}% - 0.5em)` }}>
              {t}
            </span>
          ))}
        </div>
        <div>
          <div className="relative h-40">
            {ticks.map((t) => (
              <span key={t} className="absolute inset-x-0 border-t border-border/70" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden="true" />
            ))}
            <ul className="absolute inset-0 flex items-end gap-[2px]">
              {buckets.map((b) => (
                <li key={b.key} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0} aria-label={`${b.label}: ${plural(b.count, unit)}`}>
                  <span
                    className={cn('w-full max-w-7 rounded-t-[4px] transition-colors', b.count ? 'bg-foreground/80 group-hover:bg-foreground group-focus:bg-foreground' : 'bg-transparent')}
                    style={{ height: b.count ? `${(b.count / max) * 100}%` : 0 }}
                  />
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md group-hover:block group-focus:block">
                    {b.label}: {plural(b.count, unit)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-1.5 flex gap-[2px] text-[11px] text-muted-foreground" aria-hidden="true">
            {buckets.map((b, i) => (
              <span key={b.key} className="flex-1 text-center">
                {i % 3 === 0 || i === buckets.length - 1 ? b.label : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as a table</summary>
        <table className="mt-2 w-full tabular-nums">
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key} className="border-t border-border">
                <td className="py-1">{b.label}</td>
                <td className="py-1 text-right">{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars with the value written beside each one */
function BarList({ buckets, unit }: { buckets: Bucket[]; unit: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <ul className="grid gap-2">
      {buckets.map((b) => (
        <li key={b.key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm" aria-label={`${b.label}: ${plural(b.count, unit)}`}>
          <span className="truncate">{b.label}</span>
          <span className="h-3 overflow-hidden rounded-r-[4px]" aria-hidden="true">
            <span className="block h-full rounded-r-[4px] bg-foreground/75" style={{ width: b.count ? `${(b.count / max) * 100}%` : 0 }} />
          </span>
          <span className="text-right tabular-nums text-muted-foreground">{b.count}</span>
        </li>
      ))}
    </ul>
  );
}
