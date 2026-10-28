import { Bone, PageSkeleton } from '@/components/layouts/PageSkeleton';

/** Recipe page: breadcrumb, then title and intro beside the photo */
export default function Loading() {
  return (
    <PageSkeleton className="mx-auto max-w-7xl px-4 sm:px-8">
      <Bone className="mt-6 h-4 w-48" />
      <div className="grid gap-8 pt-5 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Bone className="h-16 w-full max-w-lg" />
          <Bone className="mt-3 h-6 w-1/2" />
          <Bone className="mt-6 h-4 w-full max-w-[34rem]" />
          <Bone className="mt-2 h-4 w-full max-w-[34rem]" />
          <Bone className="mt-2 h-4 w-2/3 max-w-[34rem]" />
          <Bone className="mt-8 h-20 w-full" />
        </div>
        <Bone className="aspect-square rounded-2xl lg:aspect-[9/10]" />
      </div>
    </PageSkeleton>
  );
}
