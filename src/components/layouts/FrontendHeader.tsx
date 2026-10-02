'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Monitor, LogOut, User, Settings, Menu } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { APP_NAME, features } from '@/lib/config/app';
import { useAuth } from '@/lib/supabase/auth';
import { useAppearanceSettings, type Theme } from '@/hooks/useAppearanceSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Cycle order for the theme toggle button
const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

interface FrontendHeaderProps {
  /** Override the logo href. Defaults to '/'. */
  logoHref?: string;
  /**
   * Optional navigation rendered between the brand and the right-side controls.
   * Pass a <nav> element (or any JSX) for app-specific links.
   *
   * Example:
   *   <FrontendHeader nav={
   *     <nav className="hidden md:flex items-center gap-6">
   *       <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
   *       <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
   *     </nav>
   *   } />
   */
  nav?: React.ReactNode;
  /** Links for the small-screen menu (shown below md, where `nav` is usually hidden) */
  mobileLinks?: { href: string; label: string }[];
}

/**
 * Reusable public-facing header for the frontend / account area.
 *
 * Includes:
 *  - Brand logo + app name
 *  - Optional centre nav (pass via `nav` prop)
 *  - Compact theme toggle (cycles light → dark → system)
 *  - Auth state: Sign in link (unauthenticated) or avatar dropdown (authenticated)
 *
 * To use in a page or layout:
 *   import { FrontendHeader } from '@/components/layouts/FrontendHeader';
 */
export function FrontendHeader({ logoHref = '/', nav, mobileLinks }: FrontendHeaderProps) {
  const { user, isLoading } = useAuth();
  const { theme, setTheme } = useAppearanceSettings();
  const pathname = usePathname();

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  const initials = user?.email
    ? user.email[0].toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-17 flex items-center gap-4">

        {/* Brand */}
        <Link href={logoHref} className="flex items-center gap-2.5 flex-shrink-0" aria-label={`${APP_NAME} home`}>
          <LogoMark size={44} />
          <span className="hidden sm:block leading-none">
            <span className="block font-display text-2xl text-foreground">{APP_NAME.replace(/\s+/g, '')}</span>
            <span className="block text-[0.6875rem] font-semibold text-foreground">NE1forSeconds</span>
          </span>
        </Link>

        {/* Primary nav — pass via the `nav` prop */}
        {nav && <div className="flex-1 ml-6">{nav}</div>}

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto">

          {/* Small-screen menu */}
          {mobileLinks && mobileLinks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="md:hidden h-9 w-9 flex items-center justify-center rounded-full text-foreground hover:bg-accent transition-colors"
                  aria-label="Menu"
                >
                  <Menu size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {mobileLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="cursor-pointer text-[0.9375rem]">
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            title={`Theme: ${THEME_LABELS[theme]} (click to change)`}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={`Current theme: ${THEME_LABELS[theme]}. Click to cycle.`}
          >
            {THEME_ICONS[theme]}
          </button>

          {/* Auth state — fixed-width slot so the controls beside it don't move
              when the placeholder becomes "Sign in" or the avatar */}
          <div className="flex w-[5.25rem] justify-end">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : !user ? (
            <Link
              href={pathname && pathname !== '/' ? `/login?next=${encodeURIComponent(pathname)}` : '/login?next=%2F'}
              className="text-sm font-medium text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
            >
              Sign in
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Account menu"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                {features.account && (
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                      <User size={14} />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                    <Settings size={14} />
                    Admin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* <a> forces full page reload so router cache clears after sign-out */}
                <DropdownMenuItem asChild>
                  <a href="/auth/signout" className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut size={14} />
                    Sign out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
