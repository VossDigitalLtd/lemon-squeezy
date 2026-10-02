'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { setPendingSave } from '@/lib/pendingSave';
import { features } from '@/lib/config/app';

interface SaveRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  recipeTitle: string;
}

/**
 * Shown when a signed-out visitor taps a heart. Remembers the recipe so it's
 * saved for them as soon as they've signed in or created an account.
 */
export function SaveRecipeDialog({ open, onOpenChange, recipeId, recipeTitle }: SaveRecipeDialogProps) {
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || '/');
  const remember = () => setPendingSave(recipeId, recipeTitle);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl p-8 sm:max-w-md">
        <span className="grid size-14 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
          <Heart size={26} className="fill-current" />
        </span>
        <DialogTitle className="mt-2 font-display text-[1.875rem] font-normal leading-tight">
          Save {recipeTitle} to your recipe box
        </DialogTitle>
        <DialogDescription className="text-base">
          A free account keeps every recipe you love in one place, ready on your phone, tablet or laptop.
          We&rsquo;ll save this one for you as soon as you&rsquo;re in.
        </DialogDescription>
        <div className="mt-3 grid gap-2.5">
          {features.signup && (
            <Link
              href={`/signup?next=${next}`}
              onClick={remember}
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition hover:brightness-95"
            >
              Create a free account
            </Link>
          )}
          <Link
            href={`/login?next=${next}`}
            onClick={remember}
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card font-medium transition hover:border-foreground"
          >
            {features.signup ? 'I already have an account' : 'Sign in'}
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
