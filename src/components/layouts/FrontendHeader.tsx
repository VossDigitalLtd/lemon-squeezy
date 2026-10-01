'use client';

import Link from 'next/link';
import { Sun, Moon, Monitor, LogOut, User, Settings } from 'lucide-react';
import { AppIcon } from '@/components/ui/AppIcon';
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
export function FrontendHeader({ logoHref = '/', nav }: FrontendHeaderProps) {
  const { user, isLoading } = useAuth();
  const { theme, setTheme } = useAppearanceSettings();

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  const initials = user?.email
    ? user.email[0].toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">

        {/* Brand */}
        <Link href={logoHref} className="flex items-center gap-2 flex-shrink-0">
          <AppIcon size={44} />
          <span className="font-semibold text-base text-foreground hidden sm:block">{APP_NAME}</span>
        </Link>

        {/* Primary nav — pass via the `nav` prop */}
        {nav && <div className="flex-1 ml-4">{nav}</div>}

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto">

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

          {/* Auth state */}
          {isLoading ? (
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
          ) : !user ? (
            <Link
              href="/login"
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
    </header>
  );
}
