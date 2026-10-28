import { Bone, CardGridSkeleton, PageSkeleton } from '@/components/layouts/PageSkeleton';

/** Home page (and any frontend page without its own loading screen) */
export default function Loading() {
  return (
    <PageSkeleton className="mx-auto max-w-7xl px-4 pt-8 sm:px-8 lg:pt-12">
      <div className="grid gap-8 lg:grid-cols-[5fr_6fr] lg:items-center lg:gap-14">
        <Bone className="aspect-[5/4] rounded-2xl lg:order-2" />
        <div>
          <Bone className="h-3 w-40" />
          <Bone className="mt-4 h-14 w-full max-w-md" />
          <Bone className="mt-5 h-4 w-full max-w-[34rem]" />
          <Bone className="mt-2 h-4 w-2/3 max-w-[34rem]" />
          <Bone className="mt-8 h-12 w-44 rounded-full" />
        </div>
      </div>
      <Bone className="mt-18 h-9 w-72" />
      <CardGridSkeleton count={3} className="mt-7" />
    </PageSkeleton>
  );
}
