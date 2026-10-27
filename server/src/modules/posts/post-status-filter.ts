import { PostStatus, Prisma } from '@prisma/client';

/**
 * Filter by the status a user actually sees. An ACTIVE post that is past its expiry date counts as EXPIRED
 * even before the sweep has written EXPIRED in the database (the sweep runs at most once a minute).
 */
export function statusWhere(
  status: PostStatus,
  now: Date,
): Prisma.PostWhereInput {
  if (status === PostStatus.ACTIVE) {
    return { status: PostStatus.ACTIVE, expiresAt: { gt: now } };
  }
  if (status === PostStatus.EXPIRED) {
    return {
      OR: [
        { status: PostStatus.EXPIRED },
        { status: PostStatus.ACTIVE, expiresAt: { lte: now } },
      ],
    };
  }
  return { status };
}
