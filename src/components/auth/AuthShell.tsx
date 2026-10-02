import Link from 'next/link';
import Image from 'next/image';
import { Heart, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { LogoMark, LaceBand } from '@/components/brand';
import { APP_NAME } from '@/lib/config/app';

export interface AuthPhoto {
  url: string;
  alt: string;
}

const BENEFITS = [
  { icon: Heart, title: 'Save with one tap', text: 'Heart any recipe and it goes straight into your recipe box.' },
  { icon: LayoutGrid, title: 'Ready on any device', text: 'Sign in on your phone in the kitchen or your laptop at the shops.' },
  { icon: SlidersHorizontal, title: 'Find the right one fast', text: 'Filter your saved recipes by time, course or cuisine.' },
];

/**
 * Frame for sign in, sign up and password reset: the form on the left, and on
 * wide screens a panel showing what an account is for (saving recipes).
 */
export function AuthShell({ photos = [], children }: { photos?: AuthPhoto[]; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Form side */}
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" className="flex w-fit items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <LogoMark size={44} />
          <span className="leading-none">
            <span className="block font-display text-2xl">{APP_NAME.replace(/\s+/g, '')}</span>
            <span className="block text-[0.6875rem] font-semibold">NE1forSeconds</span>
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/recipes" className="hover:text-foreground hover:underline">
            Carry on browsing recipes
          </Link>
        </p>
      </div>

      {/* Why sign in: wide screens only */}
      <aside className="relative hidden overflow-hidden bg-brand-muted lg:flex lg:flex-col">
        <LaceBand />
        <div className="flex flex-1 flex-col justify-center px-14 py-12 xl:px-20">
          {photos.length > 0 && (
            <div className="mb-12 flex items-end" aria-hidden="true">
              {photos.slice(0, 3).map((p, i) => (
                <div
                  key={p.url}
                  className={
                    'relative overflow-hidden rounded-2xl border-4 border-brand-muted shadow-[0_18px_40px_-18px_oklch(0.3_0.08_95/0.5)] ' +
                    (i === 1 ? 'z-10 -mx-6 aspect-[4/5] w-44 -rotate-2' : 'aspect-[4/5] w-36 ' + (i === 0 ? 'rotate-3' : '-rotate-6'))
                  }
                >
                  <Image src={p.url} alt="" fill sizes="176px" className="object-cover" />
                  {i === 1 && (
                    <span className="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full bg-card/90 text-red-600 shadow-card">
                      <Heart size={16} className="fill-current" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.12em]">Your recipe box</p>
          <h2 className="mt-3 max-w-md font-display text-[clamp(2.5rem,3.6vw,3.5rem)] leading-[1.02]">
            Keep the recipes you love
          </h2>
          <ul className="mt-8 grid max-w-md gap-5">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 flex-shrink-0 place-items-center rounded-full bg-card shadow-card">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <LaceBand flip />
      </aside>
    </div>
  );
}

/** Heading block used at the top of each auth form */
export function AuthHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-[2.5rem] leading-[1.05] text-balance">{title}</h1>
      {children && <div className="mt-2.5 text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Shared class names for the auth forms */
export const authStyles = {
  input: 'h-12 rounded-xl text-base',
  primaryButton:
    'inline-flex h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-50',
  link: 'font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground',
};
