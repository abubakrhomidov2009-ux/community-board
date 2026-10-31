'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { toApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import type { PostStatus, ReportStatus, Role } from '../api';

/** A small coloured label (role, status, report state). */
export function Pill({
  tone,
  children,
}: {
  tone: 'green' | 'amber' | 'red' | 'grey' | 'blue' | 'ink';
  children: ReactNode;
}) {
  const tones = {
    green: 'bg-primary-soft text-primary-soft-ink',
    amber: 'bg-note text-note-ink border border-note-border',
    red: 'bg-danger-soft text-danger',
    grey: 'bg-soft text-body-2',
    blue: 'bg-[color-mix(in_srgb,var(--tutor)_16%,var(--paper))] text-tutor-ink',
    ink: 'bg-ink text-on-ink',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-bold',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const t = useTranslations('admin.roles');
  return (
    <Pill tone={role === 'SUPER_ADMIN' ? 'amber' : role === 'ADMIN' ? 'blue' : 'grey'}>
      {t(role)}
    </Pill>
  );
}

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const t = useTranslations('admin.postStatus');
  const tone = { ACTIVE: 'green', RESOLVED: 'blue', EXPIRED: 'grey', REMOVED: 'red' } as const;
  return <Pill tone={tone[status]}>{t(status)}</Pill>;
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const t = useTranslations('admin.reportStatus');
  const tone = { OPEN: 'amber', RESOLVED: 'green', DISMISSED: 'grey' } as const;
  return <Pill tone={tone[status]}>{t(status)}</Pill>;
}

/** Previous / next with "Page 2 of 7". */
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const t = useTranslations('admin');
  if (totalPages <= 1) return null;
  const btn =
    'flex h-11 items-center gap-1 rounded-full border-[1.5px] border-ink bg-paper px-4 text-sm font-bold text-ink disabled:opacity-40';
  return (
    <nav aria-label={t('pager')} className="flex items-center justify-center gap-3 pt-2">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
        {t('prev')}
      </button>
      <span className="text-sm font-semibold text-body-2">
        {t('pageOf', { page, total: totalPages })}
      </span>
      <button
        type="button"
        className={btn}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t('next')}
        <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </nav>
  );
}

/** A segmented filter (All / Open / Resolved ...). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-paper p-1 [scrollbar-width:none]"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-10 shrink-0 rounded-full px-4 text-sm transition-colors duration-150',
            option.value === value ? 'bg-ink font-bold text-on-ink' : 'font-semibold text-body',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <>
      <label htmlFor="admin-search" className="sr-only">
        {label}
      </label>
      <input
        id="admin-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="h-11 min-w-0 flex-1 rounded-full border-[1.5px] border-line bg-paper px-5 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none sm:max-w-[320px]"
      />
    </>
  );
}

/** A card with a table on a laptop; every row becomes its own card on a phone (see `data-label`). */
export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-paper">
      <table className="w-full border-collapse text-left text-sm max-md:block">
        <thead className="max-md:hidden">
          <tr className="border-b border-border bg-soft text-xs uppercase tracking-[0.6px] text-body-2">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-border last:border-0 max-md:flex max-md:flex-col max-md:gap-1.5 max-md:p-4">
      {children}
    </tr>
  );
}

export function Cell({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle max-md:flex max-md:items-center max-md:gap-2 max-md:p-0',
        className,
      )}
    >
      {label && (
        <span className="hidden text-xs font-bold uppercase tracking-[0.6px] text-muted max-md:inline">
          {label}:
        </span>
      )}
      {children}
    </td>
  );
}

export function errorMessage(t: ReturnType<typeof useTranslations>, error: unknown): string {
  const code = toApiError(error).errorCode;
  return t.has(`errors.${code}` as never)
    ? t(`errors.${code}` as never)
    : t('errors.UNKNOWN' as never);
}
