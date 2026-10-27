import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Locale, PostStatus, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { FavoritesService } from './favorites.service';

const user: AuthUser = {
  id: 'u1',
  email: 'aziza@example.com',
  username: 'aziza',
  role: Role.USER,
  isBlocked: false,
  universityEmail: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  const prisma = {
    post: { findUnique: jest.fn() },
    favorite: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(FavoritesService);
  });

  async function expectNotFound(promise: Promise<unknown>) {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).errorCode).toBe(ErrorCode.POST_NOT_FOUND);
    expect((error as AppException).getStatus()).toBe(HttpStatus.NOT_FOUND);
  }

  describe('add', () => {
    it('saves the post (and saving twice is harmless because it is an upsert)', async () => {
      prisma.post.findUnique.mockResolvedValue({ status: PostStatus.ACTIVE });
      await service.add(user, 'p1');
      expect(prisma.favorite.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_postId: { userId: 'u1', postId: 'p1' } },
          create: { userId: 'u1', postId: 'p1' },
        }),
      );
    });

    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectNotFound(service.add(user, 'x'));
    });

    it('throws POST_NOT_FOUND for a removed post', async () => {
      prisma.post.findUnique.mockResolvedValue({ status: PostStatus.REMOVED });
      await expectNotFound(service.add(user, 'p1'));
      expect(prisma.favorite.upsert).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes only my own save', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1' });
      await service.remove(user, 'p1');
      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', postId: 'p1' },
      });
    });

    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectNotFound(service.remove(user, 'x'));
    });
  });

  describe('list', () => {
    it('lists my saved posts, hides removed ones and marks isFavorite', async () => {
      const post = {
        id: 'p1',
        title: 'Math tutor',
        description: 'Calculus lessons',
        category: 'TUTORING',
        district: 'SINO',
        status: PostStatus.ACTIVE,
        price: 100,
        priceUnit: 'PER_HOUR',
        contactTelegram: 'aziza_tutor',
        contactPhone: null,
        latitude: null,
        longitude: null,
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: 'u2',
        images: [],
        author: { username: 'rustam', isStudentVerified: false },
        _count: { comments: 0 },
      };
      prisma.favorite.findMany.mockResolvedValue([{ post }]);
      prisma.favorite.count.mockResolvedValue(1);

      const result = await service.list(user, { page: 1, limit: 20 });

      const args = (prisma.favorite.findMany.mock.calls[0] as unknown[])[0] as {
        where: { userId: string; post: { status: { not: PostStatus } } };
      };
      expect(args.where.userId).toBe('u1');
      expect(args.where.post.status.not).toBe(PostStatus.REMOVED);
      expect(result.items[0].isFavorite).toBe(true);
      expect(result.total).toBe(1);
    });
  });
});
