import Link from 'next/link';
import { FrontendHeader } from '@/components/layouts/FrontendHeader';
import { LogoMark } from '@/components/brand';
import { FRONTEND_NAV_LINKS } from '@/lib/config/navigation';

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FrontendHeader
        nav={
          <nav className="hidden md:flex items-center gap-7" aria-label="Main">
            {FRONTEND_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-1.5 text-[0.9375rem] font-medium text-foreground border-b-2 border-transparent hover:border-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        }
      />
      {/* A page can end on a full-bleed band ([data-flush-bottom]) that meets the footer */}
      <main className="flex-1 pb-20 [&:has(>[data-flush-bottom]:last-child)]:pb-0">{children}</main>
      <footer className="bg-footer text-footer-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 grid justify-items-center gap-6 text-center">
          <LogoMark size={52} className="text-footer-foreground" />
          <nav className="flex flex-wrap justify-center gap-6 text-[0.9375rem]" aria-label="Footer">
            {FRONTEND_NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="font-semibold">
            Brought to you by <span className="border-b-2 border-primary">NE1forSeconds</span>
          </p>
          <p className="text-[0.9375rem] text-footer-foreground/70">
            Lemon Squeezy · Simple, delicious recipes made easy · Καλή όρεξη
          </p>
        </div>
      </footer>
    </div>
  );
}
