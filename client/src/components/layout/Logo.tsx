import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** The round logo plus the wordmark: "community" in ink and "board" in green. */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  const t = useTranslations('common');
  const px = size === 'md' ? 32 : 30;
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 text-ink no-underline', className)}>
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={px}
        height={px}
        priority
        className="rounded-full"
      />
      <span
        className={cn(
          'font-brand font-bold tracking-[-0.3px]',
          size === 'md' ? 'text-[15px]' : 'text-sm',
        )}
      >
        {t('wordmarkStart')}
        <span className="text-primary">{t('wordmarkEnd')}</span>
      </span>
    </Link>
  );
}
