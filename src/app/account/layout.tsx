'use client';

import { useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth';
import { FrontendHeader } from '@/components/layouts/FrontendHeader';
import { ACCOUNT_NAV_LINKS, FRONTEND_NAV_LINKS } from '@/lib/config/navigation';

// BOLT-ON: account — public-facing account area for end-users.
// The layout uses FrontendHeader (shared with any public-facing pages) and
// renders the account section nav as a horizontal tab strip below the header.
//
// APP-SPECIFIC ACCOUNT PAGES
// Add pages as siblings of this layout, e.g.:
//   src/app/account/courses/page.tsx  — course history
//   src/app/account/invoices/page.tsx — billing & invoices
// Register nav links in src/lib/config/navigation.tsx → ACCOUNT_NAV_LINKS

export default function AccountLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login?next=/account');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/account' ? pathname === '/account' : pathname.startsWith(href);

  const frontendNav = FRONTEND_NAV_LINKS.length > 0 ? (
    <nav className="hidden md:flex items-center gap-6">
      {FRONTEND_NAV_LINKS.map(link => (
        <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {link.label}
        </Link>
      ))}
    </nav>
  ) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <FrontendHeader logoHref="/" nav={frontendNav} />

      {/* Account section nav — horizontal scrollable tabs */}
      <div className="border-b border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Account navigation">
            {ACCOUNT_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive(link.href)
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
