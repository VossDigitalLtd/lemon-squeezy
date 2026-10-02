import Link from 'next/link';
import { SiteHeader } from '@/components/layouts/SiteHeader';
import { ThemeSwitcher } from '@/components/layouts/ThemeSwitcher';
import { LogoMark } from '@/components/brand';
import { PendingSaveHandler } from '@/components/recipe/PendingSaveHandler';
import { FRONTEND_NAV_LINKS } from '@/lib/config/navigation';

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PendingSaveHandler />
      <SiteHeader />
      {/* A page can end on a full-bleed band ([data-flush-bottom]) that meets the footer.
          flex-col lets a page band grow to fill the height (flex-1); children are
          forced full width because centred mx-auto boxes otherwise shrink to fit
          their content in a flex column (e.g. one search result). */}
      <main className="flex flex-1 flex-col pb-20 print:pb-0 [&>*]:w-full [&:has(>[data-flush-bottom]:last-child)]:pb-0">{children}</main>
      <footer className="bg-footer text-footer-foreground print:hidden">
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
          <ThemeSwitcher tone="footer" className="mt-2" />
        </div>
      </footer>
    </div>
  );
}
