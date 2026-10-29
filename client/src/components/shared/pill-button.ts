import { cn } from '@/lib/utils';

const variants = {
  ink: 'bg-ink text-on-ink hover:bg-ink/85',
  green: 'bg-primary text-on-primary hover:bg-primary-hover',
  outline: 'border-[1.5px] border-ink bg-paper text-ink hover:bg-soft',
  white: 'bg-paper text-ink hover:bg-soft',
} as const;

const sizes = {
  md: 'h-11 px-[22px] text-sm',
  lg: 'h-14 px-7 text-base',
  xl: 'h-[58px] px-[30px] text-base',
  block: 'h-[54px] w-full text-base',
} as const;

/** Class names of the pill-shaped button of the design (use on a <button> or a <Link>). */
export function pillClass(
  variant: keyof typeof variants = 'ink',
  size: keyof typeof sizes = 'lg',
  extra?: string,
) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full font-bold no-underline',
    'transition-[background-color,transform,opacity] duration-150 ease-out',
    'active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-60',
    variants[variant],
    sizes[size],
    extra,
  );
}
