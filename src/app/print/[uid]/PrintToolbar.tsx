'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Printer } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PrintToolbarProps {
  uid: string;
  servings: number;
  baseServings: number;
  system: 'metric' | 'imperial';
}

/** Screen-only controls above the printable page */
export function PrintToolbar({ uid, servings, baseServings, system }: PrintToolbarProps) {
  const router = useRouter();
  const go = (s: number, u: string) => router.replace(`/print/${uid}?servings=${s}&units=${u}`, { scroll: false });

  return (
    <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
      <Link href={`/${uid}`} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
        <ArrowLeft size={16} /> Back to the recipe
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-card" role="group" aria-label="Servings">
          <button type="button" onClick={() => go(Math.max(1, servings - 1), system)} disabled={servings <= 1} className="grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30" aria-label="Fewer servings">
            <Minus size={15} />
          </button>
          <span className="w-24 text-center text-sm tabular-nums">
            {servings} serving{servings === 1 ? '' : 's'}
          </span>
          <button type="button" onClick={() => go(Math.min(48, servings + 1), system)} className="grid size-8 place-items-center rounded-full hover:bg-muted" aria-label="More servings">
            <Plus size={15} />
          </button>
        </span>
        <span className="inline-flex gap-0.5 rounded-full bg-card p-1 shadow-card" role="group" aria-label="Units">
          {(['metric', 'imperial'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => go(servings, u)}
              aria-pressed={system === u}
              className={cn('rounded-full px-3 py-1.5 text-sm font-medium capitalize', system === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {u}
            </button>
          ))}
        </span>
        {servings !== baseServings && (
          <button type="button" onClick={() => go(baseServings, system)} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:brightness-95"
        >
          <Printer size={16} /> Print or save as PDF
        </button>
      </div>
    </div>
  );
}
