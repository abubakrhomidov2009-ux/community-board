import Image from 'next/image';
import { cn } from '@/lib/utils';

const initials = (username: string) => username.slice(0, 2).toUpperCase();

/** The profile picture, or the first two letters of the username on a warm paper circle. */
export function Avatar({
  username,
  avatarUrl,
  size = 44,
  className,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-note font-bold text-note-ink',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          fill
          unoptimized
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        initials(username)
      )}
    </span>
  );
}
