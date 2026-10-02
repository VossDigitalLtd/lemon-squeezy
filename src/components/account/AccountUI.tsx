import { cn } from '@/utils/cn';

// Shared building blocks for the /account pages, in the public site's style.

export function AccountPageHeader({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.05] text-balance">{title}</h1>
      {intro && <p className="mt-2.5 max-w-xl text-[1.0625rem] text-muted-foreground">{intro}</p>}
    </header>
  );
}

interface AccountSectionProps {
  title: string;
  description?: React.ReactNode;
  /** Shown to the right of the title on wide screens (e.g. an Enable button) */
  action?: React.ReactNode;
  tone?: 'default' | 'danger';
  children?: React.ReactNode;
  className?: string;
}

export function AccountSection({ title, description, action, tone = 'default', children, className }: AccountSectionProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border bg-card p-6 sm:p-8',
        tone === 'danger' ? 'border-destructive/40' : 'border-border',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-xl">
          <h2 className={cn('font-display text-2xl leading-tight', tone === 'danger' && 'text-destructive')}>{title}</h2>
          {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}

/** Error message for account forms; readable in light and dark mode */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {children}
    </p>
  );
}

/** Label + control + optional hint, stacked */
export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-[0.8125rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Pill-shaped button classes matching the public site (use on <button> or <Link>) */
export const pillButton = {
  base: 'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.9375rem] font-medium transition disabled:pointer-events-none disabled:opacity-50',
  primary: 'bg-primary text-primary-foreground hover:brightness-95',
  outline: 'border border-border bg-card hover:border-foreground',
  ghost: 'hover:bg-muted',
  danger: 'bg-destructive text-white hover:brightness-110',
};
