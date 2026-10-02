'use client';

import { useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, LayoutGrid, ShieldCheck, User, FileDown, LogOut, ShoppingBasket, CalendarHeart } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth';
import { ACCOUNT_NAV_LINKS } from '@/lib/config/navigation';
import { cn } from '@/utils/cn';

// BOLT-ON: account — the account area sits inside the public (frontend) layout,
// so it shares the site header, footer and type. This layout adds the section
// nav: a sidebar on wide screens, a scrolling tab strip on small ones.
// Register nav links in src/lib/config/navigation.tsx → ACCOUNT_NAV_LINKS

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  '/account': LayoutGrid,
  '/account/recipe-box': Heart,
  '/account/shopping-list': ShoppingBasket,
  '/account/menus': CalendarHeart,
  '/account/profile': User,
  '/account/security': ShieldCheck,
  '/account/data': FileDown,
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.push(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, user, router, pathname]);

  const isActive = (href: string) => (href === '/account' ? pathname === '/account' : pathname.startsWith(href));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-8 print:p-0">
      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14 print:block">
        {/* Section nav */}
        <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:overflow-visible print:hidden">
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:block">
            Your account
          </p>
          <ul className="flex gap-1.5 lg:sticky lg:top-24 lg:flex-col lg:gap-0.5">
            {ACCOUNT_NAV_LINKS.map((link) => {
              const Icon = ICONS[link.href];
              const active = isActive(link.href);
              return (
                <li key={link.href} className="flex-shrink-0">
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-colors lg:rounded-xl lg:px-3 lg:py-2.5',
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {Icon && <Icon size={17} className="flex-shrink-0" />}
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="hidden lg:mt-4 lg:block lg:border-t lg:border-border lg:pt-4">
              {/* <a> forces a full reload so the router cache clears after sign-out */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/auth/signout"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut size={17} />
                Sign out
              </a>
            </li>
          </ul>
        </nav>

        <div className="min-w-0 max-w-4xl">
          {isLoading || !user ? (
            <div className="grid h-60 place-items-center" aria-busy="true">
              <span className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
