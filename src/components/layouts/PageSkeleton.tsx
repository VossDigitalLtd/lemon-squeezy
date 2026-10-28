import { cn } from '@/utils/cn';

// Placeholders shown by the frontend loading.tsx files while a page's data
// loads, so a click on a link changes the screen straight away.

/** One grey block */
export function Bone({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/** Wrapper that tells screen readers the page is loading */
export function PageSkeleton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading" className={className}>
      {children}
    </div>
  );
}

/** A row of recipe cards: image, title and a line of detail */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Bone className="aspect-[4/3] rounded-2xl" />
          <Bone className="mt-4 h-6 w-3/4" />
          <Bone className="mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
