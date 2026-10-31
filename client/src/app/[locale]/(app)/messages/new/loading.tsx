import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto flex max-w-[1280px] gap-5 px-4 pt-4 md:px-6"
    >
      <div className="flex w-full flex-col gap-2.5 md:w-[340px]">
        <Skeleton className="mb-2 h-9 w-40 rounded-full" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[76px] rounded-[20px]" />
        ))}
      </div>
      <Skeleton className="hidden h-[600px] flex-1 rounded-[28px] md:block" />
    </div>
  );
}
