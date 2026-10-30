import { BedDouble, BookOpen, FileText, Heart, MapPin, Phone, Send, Tag } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type SlipKind = 'lost' | 'tutor' | 'rent' | 'other';
export type SlipStatus = 'resolved' | 'expired' | 'removed';

export interface SlipData {
  /** The post id. Present on real slips: the title then links to the post page. */
  id?: string;
  kind: SlipKind;
  categoryLabel: string;
  time: string;
  title: string;
  price: string;
  district: string;
  /** Shows the photo area (a placeholder until real photos are wired in). */
  photo?: boolean;
  /** The first picture of the post. Without it the photo area shows the category icon. */
  photoUrl?: string;
  /** Telegram username (without @) and phone number of the author: the Write and Call tabs. */
  telegram?: string;
  phone?: string;
  /** Tilt in degrees; the design keeps it under 1 degree on the board and a few degrees on the About page. */
  tilt?: number;
  status?: SlipStatus;
  saved?: boolean;
}

// Full class names (not built from strings) so Tailwind can find them.
const KINDS = {
  lost: {
    strip: 'bg-lost',
    label: 'text-lost-ink',
    tint: 'bg-[color-mix(in_srgb,var(--lost)_14%,var(--paper))]',
    icon: FileText,
  },
  tutor: {
    strip: 'bg-tutor',
    label: 'text-tutor-ink',
    tint: 'bg-[color-mix(in_srgb,var(--tutor)_14%,var(--paper))]',
    icon: BookOpen,
  },
  rent: {
    strip: 'bg-rent',
    label: 'text-rent-ink',
    tint: 'bg-[color-mix(in_srgb,var(--rent)_14%,var(--paper))]',
    icon: BedDouble,
  },
  other: {
    strip: 'bg-other',
    label: 'text-other-ink',
    tint: 'bg-[color-mix(in_srgb,var(--other)_14%,var(--paper))]',
    icon: Tag,
  },
} as const;

const STAMPS = {
  resolved: 'border-stamp-resolved text-stamp-resolved',
  expired: 'border-stamp-expired text-stamp-expired',
  removed: 'border-stamp-scam text-stamp-scam',
} as const;

/**
 * A post as a paper slip pinned to the board: amber pin, colored category strip, tear-off tabs
 * (Write / Call / Save) under a dashed line, and a rubber stamp for resolved, expired or removed.
 * With `interactive` false (the examples on the About page) the tabs are plain text and not focusable.
 */
export function PostSlip({
  item,
  interactive = false,
  onToggleSave,
  className,
}: {
  item: SlipData;
  interactive?: boolean;
  /** Called when the Save tab is pressed (the heart). */
  onToggleSave?: () => void;
  className?: string;
}) {
  const t = useTranslations('slip');
  const ts = useTranslations('status');
  const kind = KINDS[item.kind];
  const KindIcon = kind.icon;

  const tabBase =
    'flex h-12 items-center justify-center gap-1.5 text-[13px] font-semibold text-ink no-underline';
  const tabs = [
    {
      key: 'write',
      icon: Send,
      text: t('write'),
      label: t('writeLabel'),
      href: item.telegram ? `https://t.me/${item.telegram.replace(/^@/, '')}` : undefined,
    },
    {
      key: 'call',
      icon: Phone,
      text: t('call'),
      label: t('callLabel'),
      href: item.phone ? `tel:${item.phone}` : undefined,
    },
  ];

  return (
    <article
      className={cn(
        'relative box-border w-full rounded-[6px_6px_18px_18px] border border-border bg-paper text-ink',
        className,
      )}
      style={{ transform: `rotate(${item.tilt ?? 0}deg)` }}
    >
      <span
        aria-hidden="true"
        className="pin-dot absolute -top-[9px] left-1/2 -ml-[9px] size-[18px] rounded-full"
      />
      <div className={cn('h-[7px] rounded-[5px_5px_0_0]', kind.strip)} />

      {item.photo && (
        <div
          className={cn(
            'mx-3 mt-3 flex h-[150px] items-center justify-center rounded-[10px]',
            kind.tint,
            kind.label,
          )}
        >
          {item.photoUrl ? (
            <Image
              src={item.photoUrl}
              alt=""
              width={480}
              height={300}
              unoptimized
              className="size-full rounded-[10px] object-cover"
            />
          ) : (
            <KindIcon size={40} strokeWidth={1.5} aria-hidden="true" />
          )}
        </div>
      )}

      <div className="flex flex-col gap-[9px] p-[16px_18px]">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'flex items-center gap-[7px] text-[11px] font-bold uppercase tracking-[0.9px]',
              kind.label,
            )}
          >
            <span className={cn('size-2 rounded-full', kind.strip)} />
            {item.categoryLabel}
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs text-muted">{item.time}</span>
        </div>
        <h3 className="m-0 font-display text-base font-medium leading-[1.35] tracking-[-0.2px] [overflow-wrap:anywhere]">
          {interactive && item.id ? (
            <Link
              href={`/posts/${item.id}`}
              className="text-ink no-underline after:absolute after:inset-0 after:bottom-12 after:content-[''] hover:underline"
            >
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>
        <p className="m-0 text-[19px] font-bold text-primary">{item.price}</p>
        <p className="m-0 flex items-center gap-1.5 text-[13px] text-body-2">
          <MapPin size={15} strokeWidth={2} aria-hidden="true" />
          {item.district}
        </p>
      </div>

      <div className="grid grid-cols-3 border-t-[1.5px] border-dashed border-line">
        {tabs.map(({ key, icon: Icon, text, label, href }) =>
          interactive && href ? (
            <a
              key={key}
              href={href}
              {...(key === 'write' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              aria-label={label}
              className={cn(
                tabBase,
                'relative border-r-[1.5px] border-dashed border-line hover:bg-soft',
              )}
            >
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              {text}
            </a>
          ) : (
            <span
              key={key}
              className={cn(
                tabBase,
                'border-r-[1.5px] border-dashed border-line',
                interactive && 'text-muted',
              )}
            >
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              {text}
            </span>
          ),
        )}
        {interactive ? (
          <button
            type="button"
            aria-label={item.saved ? t('unsaveLabel') : t('saveLabel')}
            aria-pressed={Boolean(item.saved)}
            onClick={onToggleSave}
            className={cn(
              tabBase,
              'relative cursor-pointer border-0 bg-transparent hover:bg-soft',
              item.saved && 'text-danger',
            )}
          >
            <Heart
              size={15}
              strokeWidth={2}
              fill={item.saved ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            {item.saved ? t('saved') : t('save')}
          </button>
        ) : (
          <span className={cn(tabBase, item.saved && 'text-danger')}>
            <Heart
              size={15}
              strokeWidth={2}
              fill={item.saved ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            {item.saved ? t('saved') : t('save')}
          </span>
        )}
      </div>

      {item.status && (
        <span
          className={cn(
            'absolute right-4 -rotate-[9deg] rounded-md border-[2.5px] bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] px-[11px] py-[5px]',
            'font-display text-[13px] font-bold uppercase tracking-[1.2px]',
            item.photo ? 'top-[120px]' : 'top-[30px]',
            STAMPS[item.status],
          )}
        >
          {ts(item.status)}
        </span>
      )}
    </article>
  );
}

/** The placeholder shown while slips load: same shape as a real slip. */
export function SlipSkeleton({
  photo = false,
  className,
}: {
  photo?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative w-full overflow-hidden rounded-[6px_6px_18px_18px] border border-border bg-paper',
        className,
      )}
    >
      <div className="skeleton h-[7px] rounded-none" />
      {photo && <div className="skeleton mx-3 mt-3 h-[150px] rounded-[10px]" />}
      <div className="flex flex-col gap-[11px] p-[16px_18px]">
        <div className="flex justify-between">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="skeleton h-3 w-12 rounded-full" />
        </div>
        <div className="skeleton h-4 w-4/5 rounded-full" />
        <div className="skeleton h-4 w-3/5 rounded-full" />
        <div className="skeleton h-5 w-2/5 rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
      </div>
      <div className="grid grid-cols-3 border-t-[1.5px] border-dashed border-line">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-12 items-center justify-center">
            <div className="skeleton h-3 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
