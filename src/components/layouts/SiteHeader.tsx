'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Heart, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { ThemeSwitcher } from '@/components/layouts/ThemeSwitcher';
import { APP_NAME, features } from '@/lib/config/app';
import { FRONTEND_NAV_LINKS } from '@/lib/config/navigation';
import { useAuth } from '@/lib/supabase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

/**
 * Public site header: logo, section nav with a highlighter underline for the
 * current section, recipe search, recipe box and account. Small screens get a
 * slide-in menu. Blends into the page at the top; gains an edge on scroll.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu after navigating
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 transition-[box-shadow,border-color] duration-200',
        'border-b',
        scrolled ? 'border-border shadow-[0_6px_20px_-12px_oklch(0_0_0/0.18)]' : 'border-transparent'
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 sm:px-8 xl:gap-10">
        <Link href="/" className="flex flex-shrink-0 items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <LogoMark size={44} className="transition-transform duration-500 hover:rotate-[30deg] motion-reduce:transition-none" />
          <span className="leading-none">
            <span className="block font-display text-[1.375rem] tracking-[-0.01em] sm:text-[1.6rem]">{APP_NAME.replace(/\s+/g, '')}</span>
            <span className="mt-0.5 block text-[0.6875rem] font-semibold tracking-[0.02em] text-muted-foreground">
              NE1forSeconds
            </span>
          </span>
        </Link>

        <Suspense fallback={<nav className="hidden flex-1 md:block" />}>
          <MainNav />
        </Suspense>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <HeaderSearch className="hidden xl:flex" />
          <Link
            href="/recipes"
            className="hidden size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted sm:grid xl:hidden"
            aria-label="Search recipes"
          >
            <Search size={20} />
          </Link>
          <RecipeBoxLink />
          <AccountControl />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted md:hidden"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function useIsActive() {
  const pathname = usePathname();
  const params = useSearchParams();
  const linkedOther = FRONTEND_NAV_LINKS.some((l) => l.href.includes('?') && matchesQuery(l.href, pathname, params));

  return (href: string) => {
    if (href.includes('?')) return matchesQuery(href, pathname, params);
    if (href === '/recipes') return pathname === '/recipes' && !linkedOther;
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

/** "/recipes?cuisine=cypriot" matches when on /recipes with that value among the filters */
function matchesQuery(href: string, pathname: string, params: URLSearchParams) {
  const [path, query] = href.split('?');
  if (pathname !== path) return false;
  return [...new URLSearchParams(query)].every(([k, v]) => (params.get(k) ?? '').split(',').includes(v));
}

function MainNav() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="hidden flex-1 md:block">
      <ul className="flex items-center gap-0.5 lg:gap-1.5">
        {FRONTEND_NAV_LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className="group relative inline-flex h-10 items-center whitespace-nowrap rounded-full px-2.5 text-[0.9375rem] font-medium lg:px-3"
              >
                <span className="relative">
                  {link.label}
                  {/* Highlighter stroke: shown for the current section, grows in on hover */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-[-3px] bottom-[1px] -z-10 h-[0.45em] origin-left rounded-full bg-primary transition-transform duration-200 motion-reduce:transition-none',
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    )}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── Search ──────────────────────────────────────────────────────────────────

/** Plain GET form to /recipes?q=…, so it works before JavaScript loads */
function HeaderSearch({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  return (
    <form action="/recipes" role="search" className={cn('relative items-center', className)}>
      <Search size={17} className="pointer-events-none absolute left-3.5 text-muted-foreground" />
      <input
        type="search"
        name="q"
        placeholder="Search recipes"
        aria-label="Search recipes"
        autoFocus={autoFocus}
        className="h-10 w-full rounded-full border border-transparent bg-muted pl-10 pr-4 text-[0.9375rem] placeholder:text-muted-foreground transition-colors hover:border-border focus:border-transparent focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary xl:w-56 [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  );
}

// ─── Recipe box + account ────────────────────────────────────────────────────

function RecipeBoxLink() {
  const { user, isLoading } = useAuth();
  const href = user
    ? '/account/recipe-box'
    : features.signup
      ? '/signup?next=%2Faccount%2Frecipe-box'
      : '/login?next=%2Faccount%2Frecipe-box';

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full px-2.5 text-[0.9375rem] font-medium transition-colors hover:bg-muted sm:px-3.5',
        isLoading && 'invisible'
      )}
      aria-label="Your recipe box"
    >
      <Heart size={19} className="text-red-600 dark:text-red-400" />
      <span className="hidden xl:inline">Recipe box</span>
    </Link>
  );
}

function AccountControl() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // Fixed-size slot so nothing moves when the sign-in check finishes
  if (isLoading) return <span className="hidden size-10 md:block" aria-hidden="true" />;

  if (!user) {
    return (
      <Link
        href={pathname && pathname !== '/' ? `/login?next=${encodeURIComponent(pathname)}` : '/login?next=%2F'}
        className="hidden h-10 items-center rounded-full px-3.5 text-[0.9375rem] font-medium transition-colors hover:bg-muted md:inline-flex"
      >
        Sign in
      </Link>
    );
  }

  const initial = (user.user_metadata?.full_name || user.email || '?').trim()[0]?.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden size-10 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid"
          aria-label="Your account"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
        <div className="px-2 py-2">
          {user.user_metadata?.full_name && <p className="font-medium">{user.user_metadata.full_name}</p>}
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/recipe-box" className="cursor-pointer gap-2.5 rounded-xl py-2">
            <Heart size={16} /> Recipe box
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer gap-2.5 rounded-xl py-2">
            <User size={16} /> Your account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin" className="cursor-pointer gap-2.5 rounded-xl py-2">
            <Settings size={16} /> Admin
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* <a> forces a full reload so the router cache clears after sign-out */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/auth/signout" className="cursor-pointer gap-2.5 rounded-xl py-2">
            <LogOut size={16} /> Sign out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Mobile menu ─────────────────────────────────────────────────────────────

function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || '/');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-sm flex-col gap-0 overflow-y-auto bg-background p-6 sm:max-w-sm">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="mt-10">
          <HeaderSearch className="flex" />
        </div>

        <Suspense fallback={null}>
          <MobileNavLinks />
        </Suspense>

        <div className="mt-6 grid gap-2">
          {user ? (
            <>
              <MobileLink href="/account/recipe-box" icon={<Heart size={18} className="text-red-600 dark:text-red-400" />}>
                Recipe box
              </MobileLink>
              <MobileLink href="/account" icon={<User size={18} />}>
                Your account
              </MobileLink>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/auth/signout" className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-muted-foreground hover:bg-muted">
                <LogOut size={18} /> Sign out
              </a>
            </>
          ) : (
            <>
              <p className="px-1 text-muted-foreground">Save the recipes you love to your own recipe box.</p>
              {features.signup && (
                <Link
                  href={`/signup?next=${next}`}
                  className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
                >
                  Create a free account
                </Link>
              )}
              <Link
                href={`/login?next=${next}`}
                className="inline-flex h-12 items-center justify-center rounded-full border border-border font-medium"
              >
                Sign in
              </Link>
            </>
          )}
        </div>

        <div className="mt-auto pt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Theme</p>
          <ThemeSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavLinks() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="mt-6">
      <ul className="grid">
        {FRONTEND_NAV_LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className="flex items-center justify-between border-b border-border py-3.5 font-display text-[1.75rem] leading-tight"
              >
                <span className={cn(active && 'bg-[linear-gradient(transparent_60%,var(--primary)_60%,var(--primary)_92%,transparent_92%)]')}>
                  {link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium hover:bg-muted">
      {icon}
      {children}
    </Link>
  );
}
