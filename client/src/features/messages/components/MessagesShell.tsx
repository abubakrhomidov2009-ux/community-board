'use client';

import { ArrowLeft, MessageCircle, SendHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import { StateSlip } from '@/components/shared/StateSlip';
import { timeAgo } from '@/features/posts/format';
import { Link, useRouter } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '../api';
import {
  useConversations,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useStartConversation,
} from '../queries';

const timeFormat = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const dayLabel = (iso: string, locale: string, today: string, yesterday: string) => {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (diff === 0) return today;
  if (diff === 1) return yesterday;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
};

/**
 * Messages. On a laptop two panes: the list of chats on the left, the chat on the right.
 * On a phone one at a time: the list, then the full-screen chat with a back arrow.
 * `active` is a conversation id, "new" (start a chat with `to`), or nothing (only the list).
 */
export function MessagesShell({ active, to }: { active?: string; to?: string }) {
  const t = useTranslations('messages');
  const list = useConversations();
  const items = list.data?.items ?? [];
  const showChat = Boolean(active);

  return (
    <main
      id="main"
      className={cn(
        'mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pt-2 md:flex-row md:gap-5 md:px-6 md:pt-6',
        showChat ? 'pb-4 md:pb-8' : 'pb-36 md:pb-8',
      )}
    >
      <section
        aria-label={t('listLabel')}
        className={cn(
          'flex-col gap-2.5 md:flex md:w-[340px] md:shrink-0',
          showChat ? 'hidden' : 'flex',
        )}
      >
        <h1 className="m-0 mb-1.5 font-display text-[30px] font-bold tracking-[-0.8px]">
          {t('title')}
        </h1>
        {list.isPending && (
          <div role="status" aria-busy="true" className="flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[76px] rounded-[20px]" />
            ))}
          </div>
        )}
        {list.isSuccess && items.length === 0 && (
          <p className="m-0 rounded-[20px] border border-border bg-paper p-4 text-[15px] text-body">
            {t('emptyList')}
          </p>
        )}
        {items.map((c) => (
          <ConversationRow key={c.id} c={c} selected={c.id === active} />
        ))}
      </section>

      <section
        className={cn(
          'min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-border bg-paper md:flex',
          'h-[calc(100dvh-90px)] md:h-[calc(100dvh-150px)] md:min-h-[520px]',
          showChat ? 'flex' : 'hidden',
        )}
      >
        {active === 'new' && to ? (
          <NewChat to={to} />
        ) : active && active !== 'new' ? (
          <Chat id={active} conversations={items} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <StateSlip
              icon={<MessageCircle size={34} strokeWidth={1.6} aria-hidden="true" />}
              title={t('pickTitle')}
              text={t('pickText')}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function ConversationRow({ c, selected }: { c: Conversation; selected: boolean }) {
  const t = useTranslations('messages');
  const locale = useLocale();
  const unread = c.unreadCount > 0;
  return (
    <Link
      href={`/messages/${c.id}`}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-[20px] border p-3.5 no-underline',
        selected ? 'border-ink bg-ink text-on-ink' : 'border-border bg-paper text-ink',
      )}
    >
      <Avatar username={c.otherUser.username} size={46} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <b className="truncate text-[15px]">{c.otherUser.username}</b>
          <span className="shrink-0 text-xs opacity-80">{timeAgo(c.lastMessageAt, locale)}</span>
        </span>
        <span className={cn('truncate text-[13px]', unread ? 'font-bold' : 'opacity-85')}>
          {c.lastMessage
            ? `${c.lastMessage.isMine ? t('you') : ''}${c.lastMessage.body}`
            : t('noMessages')}
        </span>
      </span>
      {unread && (
        <span
          aria-label={t('unread', { count: c.unreadCount })}
          className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary"
        >
          {c.unreadCount}
        </span>
      )}
    </Link>
  );
}

function ChatHeader({ name }: { name: string }) {
  const t = useTranslations('messages');
  return (
    <header className="flex items-center gap-3 border-b-[1.5px] border-dashed border-line px-3 py-3.5 md:px-5">
      <Link
        href="/messages"
        aria-label={t('back')}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soft text-ink md:hidden"
      >
        <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
      </Link>
      <Avatar username={name} size={44} />
      <Link href={`/users/${name}`} className="truncate text-base font-bold text-ink no-underline">
        {name}
      </Link>
    </header>
  );
}

function Composer({
  onSend,
  pending,
  error,
}: {
  onSend: (body: string) => void;
  pending: boolean;
  error?: string;
}) {
  const t = useTranslations('messages');
  const [text, setText] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || pending) return;
    onSend(body);
    setText('');
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-1.5 border-t-[1.5px] border-dashed border-line p-3 md:p-4"
    >
      {error && (
        <p role="alert" className="m-0 px-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2.5">
        <label htmlFor="chat-input" className="sr-only">
          {t('inputLabel')}
        </label>
        <input
          id="chat-input"
          value={text}
          maxLength={2000}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          placeholder={t('placeholder')}
          className="h-[52px] min-w-0 flex-1 rounded-full border-[1.5px] border-ink bg-paper px-5 text-base text-ink placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label={t('send')}
          disabled={pending || text.trim() === ''}
          className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-60"
        >
          <SendHorizontal size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function errorText(t: ReturnType<typeof useTranslations>, code: string) {
  const full = `errors.${code}`;
  return t.has(full as never) ? t(full as never) : t('errors.UNKNOWN' as never);
}

function Chat({ id, conversations }: { id: string; conversations: Conversation[] }) {
  const t = useTranslations('messages');
  const tAll = useTranslations();
  const locale = useLocale();
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const markRead = useMarkConversationRead();
  const bottom = useRef<HTMLDivElement>(null);
  const known = conversations.find((c) => c.id === id);
  const items: Message[] = messages.data ?? [];
  const lastId = items[items.length - 1]?.id;
  const lastFromOther = items[items.length - 1]?.isMine === false;
  const name = known?.otherUser.username ?? items.find((m) => !m.isMine)?.sender.username ?? '…';

  // Keep the newest message in view.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  // Tell the server that I read this chat (and clear its notification) when it opens or a new message arrives.
  const { mutate: markAsRead } = markRead;
  useEffect(() => {
    if (messages.isSuccess && (lastFromOther || (known?.unreadCount ?? 0) > 0)) markAsRead(id);
  }, [id, lastId, lastFromOther, messages.isSuccess, known?.unreadCount, markAsRead]);

  if (messages.isError) {
    if (toApiError(messages.error).statusCode === 404) notFound();
  }

  const today = tAll('messages.today');
  const yesterday = tAll('messages.yesterday');

  return (
    <>
      <ChatHeader name={name} />
      <div
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-soft p-4 md:p-6"
        aria-live="polite"
      >
        {messages.isPending && <Skeleton className="h-12 w-2/3 rounded-[18px]" />}
        {messages.isSuccess && items.length === 0 && (
          <p className="m-auto text-sm text-body-2">{t('noMessages')}</p>
        )}
        {items.map((m, index) => {
          const label = dayLabel(m.createdAt, locale, today, yesterday);
          const previous = items[index - 1];
          const showDay =
            !previous || dayLabel(previous.createdAt, locale, today, yesterday) !== label;
          return (
            <div key={m.id} className="flex flex-col gap-2.5">
              {showDay && (
                <span className="self-center rounded-full border border-border bg-paper px-3 py-1 text-xs font-bold text-body-2">
                  {label}
                </span>
              )}
              <div
                className={cn(
                  'flex max-w-[82%] flex-col gap-1 md:max-w-[68%]',
                  m.isMine ? 'self-end' : 'self-start',
                )}
              >
                <span
                  className={cn(
                    'whitespace-pre-line px-4 py-3 text-[15px] leading-normal [overflow-wrap:anywhere]',
                    m.isMine
                      ? 'rounded-[18px_18px_4px_18px] bg-primary text-on-primary'
                      : 'rounded-[18px_18px_18px_4px] border border-border bg-paper text-ink',
                  )}
                >
                  {m.body}
                </span>
                <span
                  className={cn('text-[11px] text-muted', m.isMine ? 'self-end' : 'self-start')}
                >
                  {timeFormat(m.createdAt, locale)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <Composer
        onSend={(body) => send.mutate(body)}
        pending={send.isPending}
        error={send.isError ? errorText(tAll, toApiError(send.error).errorCode) : undefined}
      />
    </>
  );
}

/** The first message to someone: creates the conversation, then opens it. */
function NewChat({ to }: { to: string }) {
  const t = useTranslations('messages');
  const tAll = useTranslations();
  const router = useRouter();
  const start = useStartConversation();
  return (
    <>
      <ChatHeader name={to} />
      <div className="flex flex-1 items-center justify-center bg-soft p-6 text-center">
        <p className="m-0 max-w-[320px] text-[15px] text-body">{t('newText', { name: to })}</p>
      </div>
      <Composer
        onSend={(body) =>
          start.mutate(
            { to, body },
            { onSuccess: (conversation) => router.replace(`/messages/${conversation.id}`) },
          )
        }
        pending={start.isPending}
        error={start.isError ? errorText(tAll, toApiError(start.error).errorCode) : undefined}
      />
    </>
  );
}
