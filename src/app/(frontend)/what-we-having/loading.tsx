import { Bone, PageSkeleton } from '@/components/layouts/PageSkeleton';

/** Keeps the yellow intro band, so the page doesn't flash white first */
export default function Loading() {
  return (
    <PageSkeleton>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-8 lg:pb-12 lg:pt-14">
          <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] leading-none">What We Having?</h1>
          <div aria-hidden="true" className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-md bg-primary-foreground/15" />
          <div aria-hidden="true" className="mt-7 h-12 w-64 animate-pulse rounded-full bg-primary-foreground/15" />
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-8">
        <Bone className="h-12 w-48 rounded-full" />
        <Bone className="mt-8 h-64 w-full rounded-2xl" />
      </div>
    </PageSkeleton>
  );
}
