import { Bone, CardGridSkeleton, PageSkeleton } from '@/components/layouts/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton className="mx-auto max-w-7xl px-4 pt-10 sm:px-8">
      <Bone className="h-14 w-56" />
      <Bone className="mt-3 h-4 w-60" />
      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <div className="hidden w-60 flex-shrink-0 space-y-7 lg:block">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Bone className="h-3 w-20" />
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {['w-16', 'w-20', 'w-14', 'w-24'].map((w) => (
                  <Bone key={w} className={`h-8 rounded-full ${w}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <CardGridSkeleton className="flex-1" />
      </div>
    </PageSkeleton>
  );
}
