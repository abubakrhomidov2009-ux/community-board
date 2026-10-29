import { cn } from '@/lib/utils';

/** A placeholder shaped like the content that is loading (the app has no spinners). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-xl', className)} />;
}
