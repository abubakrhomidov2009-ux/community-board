import { BedDouble, BookOpen, FileText, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Post } from '../api';

const ART = {
  LOST_FOUND: {
    icon: FileText,
    cls: 'bg-[color-mix(in_srgb,var(--lost)_14%,var(--paper))] text-lost-ink',
  },
  TUTORING: {
    icon: BookOpen,
    cls: 'bg-[color-mix(in_srgb,var(--tutor)_14%,var(--paper))] text-tutor-ink',
  },
  RENTALS: {
    icon: BedDouble,
    cls: 'bg-[color-mix(in_srgb,var(--rent)_14%,var(--paper))] text-rent-ink',
  },
  OTHER: {
    icon: Tag,
    cls: 'bg-[color-mix(in_srgb,var(--other)_14%,var(--paper))] text-other-ink',
  },
} as const;

/** The tinted placeholder with the category icon, shown when a post has no photo. */
export function CategoryArt({
  category,
  className,
}: {
  category: Post['category'];
  className?: string;
}) {
  const { icon: Icon, cls } = ART[category];
  return (
    <div className={cn('flex items-center justify-center', cls, className)}>
      <Icon size={64} strokeWidth={1.2} aria-hidden="true" />
    </div>
  );
}
