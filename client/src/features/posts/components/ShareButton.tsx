'use client';

import { Popover } from '@base-ui/react/popover';
import { Check, Copy, Send, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Share: copy the link, send it on Telegram, or (on phones and some browsers) open the system share sheet.
 */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations('share');
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const link = () => window.location.origin + window.location.pathname;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
    } catch {
      // Older browsers: select the text in a temporary field.
      const field = document.createElement('input');
      field.value = link();
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const item =
    'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-ink no-underline hover:bg-soft';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-5 text-sm font-bold text-ink">
        <Share2 size={16} strokeWidth={2} aria-hidden="true" />
        {t('button')}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-40">
          <Popover.Popup
            aria-label={t('title')}
            className="w-[260px] rounded-[18px] border border-border bg-paper p-2 shadow-[0_12px_32px_rgba(14,26,23,0.14)] outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          >
            <button type="button" onClick={() => void copy()} aria-live="polite" className={item}>
              {copied ? (
                <Check size={18} strokeWidth={2} className="text-primary" aria-hidden="true" />
              ) : (
                <Copy size={18} strokeWidth={2} aria-hidden="true" />
              )}
              {copied ? t('copied') : t('copy')}
            </button>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(link())}&text=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={item}
            >
              <Send size={18} strokeWidth={2} aria-hidden="true" />
              {t('telegram')}
            </a>
            {canNativeShare && (
              <button
                type="button"
                onClick={() => {
                  void navigator.share({ title, url: link() }).catch(() => undefined);
                  setOpen(false);
                }}
                className={item}
              >
                <Share2 size={18} strokeWidth={2} aria-hidden="true" />
                {t('more')}
              </button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
