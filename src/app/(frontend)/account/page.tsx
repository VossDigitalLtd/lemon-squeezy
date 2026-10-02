import Link from 'next/link';
import { ArrowRight, ChevronRight, FileDown, ShieldCheck, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FavouriteService } from '@/lib/supabase/services';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { FavouriteHeart } from '@/components/recipe/FavouriteHeart';
import { pillButton } from '@/components/account/AccountUI';
import { cn } from '@/utils/cn';
import type { Metadata } from 'next';
import type { Profile } from '@/types';

export const metadata: Metadata = { title: 'Your account' };

const SETTINGS = [
  { href: '/account/profile', icon: User, label: 'Profile', description: 'Your name and photo' },
  { href: '/account/security', icon: ShieldCheck, label: 'Security', description: 'Password, two-factor sign-in and other devices' },
  { href: '/account/data', icon: FileDown, label: 'Data & privacy', description: 'Download your data or delete your account' },
];

export default async function AccountOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, favouritesResult, idsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    FavouriteService.getUserFavourites(supabase, user!.id, { limit: 3 }),
    FavouriteService.getUserFavouriteIds(supabase, user!.id),
  ]);

  const p = profile as Profile | null;
  const firstName = p?.full_name?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || 'there';
  const recent = favouritesResult.success ? favouritesResult.data! : [];
  const savedCount = idsResult.success ? idsResult.data!.length : recent.length;

  return (
    <div className="grid gap-14">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your kitchen</p>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.05]">Welcome back, {firstName}</h1>
        <p className="mt-2.5 text-[1.0625rem] text-muted-foreground">
          {savedCount > 0
            ? `You've saved ${savedCount} recipe${savedCount === 1 ? '' : 's'}. Here's what you hearted most recently.`
            : 'Save recipes with the heart and they’ll be waiting for you here.'}
        </p>
      </header>

      {/* Recently saved */}
      <section aria-labelledby="recent-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 id="recent-title" className="font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight">
            Recently saved
          </h2>
          {savedCount > 0 && (
            <Link href="/account/recipe-box" className="inline-flex items-center gap-1.5 border-b-2 border-primary pb-0.5 text-[0.9375rem] font-medium">
              Open recipe box{savedCount > recent.length ? ` (${savedCount})` : ''} <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {recent.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                sizes="(min-width: 1280px) 22vw, (min-width: 640px) 40vw, 100vw"
                action={<FavouriteHeart recipeId={r.id} recipeTitle={r.title} initialFavourited />}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-brand-muted p-8 sm:p-10">
            <p className="font-display text-2xl">Your recipe box is empty</p>
            <p className="mt-2 max-w-md text-muted-foreground">
              Tap the heart on any recipe to keep it here, ready for the next time you&rsquo;re wondering what to cook.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/recipes" className={cn(pillButton.base, pillButton.primary)}>
                Browse recipes <ArrowRight size={17} />
              </Link>
              <Link href="/what-we-having" className={cn(pillButton.base, pillButton.outline)}>
                What We Having?
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Settings */}
      <section aria-labelledby="settings-title">
        <h2 id="settings-title" className="mb-4 font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight">
          Settings
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {SETTINGS.map(({ href, icon: Icon, label, description }) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 sm:px-6">
                <span className="grid size-10 flex-shrink-0 place-items-center rounded-full bg-brand-muted">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-sm text-muted-foreground">{description}</span>
                </span>
                <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
