import Link from 'next/link';
import { FrontendHeader } from '@/components/layouts/FrontendHeader';
import { FRONTEND_NAV_LINKS } from '@/lib/config/navigation';

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FrontendHeader
        nav={
          <nav className="hidden md:flex items-center gap-6">
            {FRONTEND_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        }
      />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Lemon Squeezy &mdash; Simple, delicious recipes made easy
      </footer>
    </div>
  );
}
