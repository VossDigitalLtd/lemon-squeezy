'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { features } from '@/lib/config/app';

interface SignInPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ReactNode;
  title: string;
  text: string;
  /** Where to come back to after signing in (defaults to this page) */
  next?: string;
}

/** Explains what an account adds and offers sign-up / sign-in, returning here afterwards */
export function SignInPromptDialog({ open, onOpenChange, icon, title, text, next }: SignInPromptDialogProps) {
  const pathname = usePathname();
  const back = encodeURIComponent(next ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname || '/'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl p-8 sm:max-w-md">
        <span className="grid size-14 place-items-center rounded-full bg-brand-muted">{icon}</span>
        <DialogTitle className="mt-2 font-display text-[1.875rem] font-normal leading-tight">{title}</DialogTitle>
        <DialogDescription className="text-base">{text}</DialogDescription>
        <div className="mt-3 grid gap-2.5">
          {features.signup && (
            <Link
              href={`/signup?next=${back}`}
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition hover:brightness-95"
            >
              Create a free account
            </Link>
          )}
          <Link
            href={`/login?next=${back}`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card font-medium transition hover:border-foreground"
          >
            {features.signup ? 'I already have an account' : 'Sign in'}
          </Link>
          <button type="button" onClick={() => onOpenChange(false)} className="h-10 text-sm text-muted-foreground hover:text-foreground">
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
