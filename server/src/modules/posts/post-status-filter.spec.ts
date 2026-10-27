import { PostStatus } from '@prisma/client';
import { statusWhere } from './post-status-filter';

describe('statusWhere', () => {
  const now = new Date('2026-03-10T12:00:00Z');

  it('ACTIVE means active AND not past its date', () => {
    expect(statusWhere(PostStatus.ACTIVE, now)).toEqual({
      status: PostStatus.ACTIVE,
      expiresAt: { gt: now },
    });
  });

  it('EXPIRED also catches ACTIVE posts that are past their date but not swept yet', () => {
    expect(statusWhere(PostStatus.EXPIRED, now)).toEqual({
      OR: [
        { status: PostStatus.EXPIRED },
        { status: PostStatus.ACTIVE, expiresAt: { lte: now } },
      ],
    });
  });

  it('other statuses are an exact match', () => {
    expect(statusWhere(PostStatus.REMOVED, now)).toEqual({
      status: PostStatus.REMOVED,
    });
    expect(statusWhere(PostStatus.RESOLVED, now)).toEqual({
      status: PostStatus.RESOLVED,
    });
  });
});
