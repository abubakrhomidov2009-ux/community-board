import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  Category,
  District,
  Locale,
  PostStatus,
  PriceUnit,
  Role,
} from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { PostSort } from './dto/post-query.dto';
import { PostsService } from './posts.service';

const user: AuthUser = {
  id: 'u1',
  email: 'aziza@example.com',
  username: 'aziza',
  role: Role.USER,
  isBlocked: false,
  universityEmail: null,
  avatarUrl: null,
  avatarPublicId: null,
  isStudentVerified: false,
  preferredLocale: Locale.EN,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};
const other: AuthUser = { ...user, id: 'u2', username: 'rustam' };
const admin: AuthUser = {
  ...user,
  id: 'u3',
  username: 'admin',
  role: Role.ADMIN,
};

const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    title: 'Math tutor',
    description: 'Calculus and algebra lessons',
    category: Category.TUTORING,
    district: District.SINO,
    status: PostStatus.ACTIVE,
    price: 100,
    priceUnit: PriceUnit.PER_HOUR,
    contactTelegram: 'aziza_tutor',
    contactPhone: null,
    latitude: null,
    longitude: null,
    expiresAt: future,
    expiryWarningSentAt: null,
    removedReason: null,
    authorId: 'u1',
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    images: [],
    author: { username: 'aziza', isStudentVerified: false },
    _count: { comments: 2 },
    ...overrides,
  };
}

const validDto = {
  title: 'Math tutor',
  description: 'Calculus and algebra lessons',
  category: Category.TUTORING,
  district: District.SINO,
  price: 100,
  priceUnit: PriceUnit.PER_HOUR,
  contactTelegram: 'aziza_tutor',
};

describe('PostsService', () => {
  let service: PostsService;
  const prisma = {
    post: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    favorite: { findMany: jest.fn() },
  };
  const cloudinary = { destroyMany: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.favorite.findMany.mockResolvedValue([]);
    prisma.post.updateMany.mockResolvedValue({ count: 0 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
      ],
    }).compile();
    service = moduleRef.get(PostsService);
  });

  const lastArgs = <T>(fn: jest.Mock): T =>
    (fn.mock.calls[fn.mock.calls.length - 1] as unknown[])[0] as T;

  async function expectError(
    promise: Promise<unknown>,
    code: ErrorCode,
    status: HttpStatus,
  ) {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).errorCode).toBe(code);
    expect((error as AppException).getStatus()).toBe(status);
  }

  describe('create', () => {
    beforeEach(() => {
      prisma.post.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve(makePost(data)),
      );
    });

    it('saves the post for the user and expires it in 30 days', async () => {
      await service.create(user, validDto);
      const { data } = lastArgs<{
        data: { authorId: string; expiresAt: Date };
      }>(prisma.post.create);
      expect(data.authorId).toBe('u1');
      const days =
        (data.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThan(29.9);
      expect(days).toBeLessThan(30.1);
    });

    it('throws CONTACT_REQUIRED without Telegram and phone', async () => {
      await expectError(
        service.create(user, { ...validDto, contactTelegram: null }),
        ErrorCode.CONTACT_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('accepts a phone number instead of Telegram', async () => {
      await expect(
        service.create(user, {
          ...validDto,
          contactTelegram: null,
          contactPhone: '+992901234567',
        }),
      ).resolves.toBeDefined();
    });

    it('throws PRICE_NOT_ALLOWED for a price on LOST_FOUND', async () => {
      await expectError(
        service.create(user, { ...validDto, category: Category.LOST_FOUND }),
        ErrorCode.PRICE_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('allows a price on RENTALS', async () => {
      await expect(
        service.create(user, { ...validDto, category: Category.RENTALS }),
      ).resolves.toBeDefined();
    });

    it('throws PRICE_UNIT_REQUIRED when the price has no unit', async () => {
      await expectError(
        service.create(user, { ...validDto, priceUnit: null }),
        ErrorCode.PRICE_UNIT_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('throws VALIDATION_FAILED when only one coordinate is sent', async () => {
      await expectError(
        service.create(user, { ...validDto, latitude: 38.5 }),
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('drops the price unit when there is no price', async () => {
      await service.create(user, {
        ...validDto,
        price: null,
        priceUnit: PriceUnit.ONCE,
      });
      const { data } = lastArgs<{ data: { priceUnit: PriceUnit | null } }>(
        prisma.post.create,
      );
      expect(data.priceUnit).toBeNull();
    });
  });

  describe('update', () => {
    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.update(user, 'x', {}),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws POST_NOT_OWNER for another user', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      await expectError(
        service.update(other, 'p1', { title: 'New title' }),
        ErrorCode.POST_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
    });

    it("does not let even an admin edit someone else's post", async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      await expectError(
        service.update(admin, 'p1', { title: 'New title' }),
        ErrorCode.POST_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
    });

    it('refuses to edit a removed post', async () => {
      prisma.post.findUnique.mockResolvedValue(
        makePost({ status: PostStatus.REMOVED }),
      );
      await expectError(
        service.update(user, 'p1', { title: 'New title' }),
        ErrorCode.POST_NOT_ACTIVE,
        HttpStatus.CONFLICT,
      );
    });

    it('only changes the fields that were sent', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      prisma.post.update.mockResolvedValue(makePost({ title: 'New title' }));
      await service.update(user, 'p1', { title: 'New title' });
      const { data } = lastArgs<{ data: Record<string, unknown> }>(
        prisma.post.update,
      );
      expect(data.title).toBe('New title');
      expect(data).not.toHaveProperty('description');
      expect(data.price).toBe(100);
    });

    it('throws PRICE_NOT_ALLOWED when moving a priced post to LOST_FOUND', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      await expectError(
        service.update(user, 'p1', { category: Category.LOST_FOUND }),
        ErrorCode.PRICE_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('lets the author clear the price with null when changing category', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      prisma.post.update.mockResolvedValue(
        makePost({
          category: Category.LOST_FOUND,
          price: null,
          priceUnit: null,
        }),
      );
      await service.update(user, 'p1', {
        category: Category.LOST_FOUND,
        price: null,
      });
      const { data } = lastArgs<{
        data: { price: number | null; priceUnit: PriceUnit | null };
      }>(prisma.post.update);
      expect(data.price).toBeNull();
      expect(data.priceUnit).toBeNull();
    });

    it('throws CONTACT_REQUIRED when the last contact is removed', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      await expectError(
        service.update(user, 'p1', { contactTelegram: null }),
        ErrorCode.CONTACT_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('remove', () => {
    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.remove(user, 'x'),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws POST_NOT_OWNER for another normal user', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'p1', authorId: 'u1' });
      await expectError(
        service.remove(other, 'p1'),
        ErrorCode.POST_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });

    it('lets the author delete and deletes the photos from Cloudinary', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 'u1',
        images: [{ publicId: 'img/a' }, { publicId: 'img/b' }],
      });
      await service.remove(user, 'p1');
      expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['img/a', 'img/b']);
    });

    it('lets an admin delete', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'p1',
        authorId: 'u1',
        images: [],
      });
      await service.remove(admin, 'p1');
      expect(prisma.post.delete).toHaveBeenCalled();
    });
  });

  describe('renew', () => {
    const renewed = () =>
      lastArgs<{
        data: {
          status: PostStatus;
          expiresAt: Date;
          expiryWarningSentAt: null;
        };
      }>(prisma.post.update).data;

    it('throws POST_NOT_OWNER for another user', async () => {
      prisma.post.findUnique.mockResolvedValue(
        makePost({ status: PostStatus.EXPIRED, expiresAt: past }),
      );
      await expectError(
        service.renew(other, 'p1'),
        ErrorCode.POST_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
    });

    it('throws RENEW_NOT_ALLOWED for a fresh ACTIVE post', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      await expectError(
        service.renew(user, 'p1'),
        ErrorCode.RENEW_NOT_ALLOWED,
        HttpStatus.CONFLICT,
      );
    });

    it('throws RENEW_NOT_ALLOWED for a RESOLVED or REMOVED post', async () => {
      prisma.post.findUnique.mockResolvedValue(
        makePost({ status: PostStatus.RESOLVED, expiresAt: past }),
      );
      await expectError(
        service.renew(user, 'p1'),
        ErrorCode.RENEW_NOT_ALLOWED,
        HttpStatus.CONFLICT,
      );
      prisma.post.findUnique.mockResolvedValue(
        makePost({ status: PostStatus.REMOVED, expiresAt: past }),
      );
      await expectError(
        service.renew(user, 'p1'),
        ErrorCode.RENEW_NOT_ALLOWED,
        HttpStatus.CONFLICT,
      );
    });

    it.each([
      ['an EXPIRED post', { status: PostStatus.EXPIRED, expiresAt: past }],
      [
        'an ACTIVE post that is past its date',
        { status: PostStatus.ACTIVE, expiresAt: past },
      ],
      [
        'an ACTIVE post expiring in 2 days',
        {
          status: PostStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
      ],
    ])(
      'renews %s for 30 days and resets the warning',
      async (_label, overrides) => {
        prisma.post.findUnique.mockResolvedValue(makePost(overrides));
        prisma.post.update.mockResolvedValue(makePost());
        await service.renew(user, 'p1');
        const data = renewed();
        expect(data.status).toBe(PostStatus.ACTIVE);
        expect(data.expiryWarningSentAt).toBeNull();
        const days =
          (data.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
        expect(days).toBeGreaterThan(29.9);
        expect(days).toBeLessThan(30.1);
      },
    );
  });

  describe('listByAuthor', () => {
    it('only lists the ACTIVE, not expired posts of that author', async () => {
      prisma.post.findMany.mockResolvedValue([makePost()]);
      prisma.post.count.mockResolvedValue(1);
      const result = await service.listByAuthor('u1', { page: 1, limit: 20 });
      const { where } = lastArgs<{
        where: {
          authorId: string;
          status: PostStatus;
          expiresAt: { gt: Date };
        };
      }>(prisma.post.findMany);
      expect(where.authorId).toBe('u1');
      expect(where.status).toBe(PostStatus.ACTIVE);
      expect(where.expiresAt.gt).toBeInstanceOf(Date);
      expect(result.total).toBe(1);
    });
  });

  describe('resolve', () => {
    it('throws POST_NOT_OWNER for another user', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      await expectError(
        service.resolve(other, 'p1'),
        ErrorCode.POST_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
    });

    it('throws POST_NOT_ACTIVE when already resolved', async () => {
      prisma.post.findUnique.mockResolvedValue(
        makePost({ status: PostStatus.RESOLVED }),
      );
      await expectError(
        service.resolve(user, 'p1'),
        ErrorCode.POST_NOT_ACTIVE,
        HttpStatus.CONFLICT,
      );
    });

    it('throws POST_NOT_ACTIVE when the post is past its expiry date', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost({ expiresAt: past }));
      await expectError(
        service.resolve(user, 'p1'),
        ErrorCode.POST_NOT_ACTIVE,
        HttpStatus.CONFLICT,
      );
    });

    it('sets the status to RESOLVED', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      prisma.post.update.mockResolvedValue(
        makePost({ status: PostStatus.RESOLVED }),
      );
      const result = await service.resolve(user, 'p1');
      expect(
        lastArgs<{ data: { status: PostStatus } }>(prisma.post.update).data
          .status,
      ).toBe(PostStatus.RESOLVED);
      expect(result.status).toBe(PostStatus.RESOLVED);
    });
  });

  describe('getById', () => {
    it('throws POST_NOT_FOUND for an unknown post', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.getById('x'),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('hides a removed post from guests and other users', async () => {
      prisma.post.findUnique.mockResolvedValue(
        makePost({ status: PostStatus.REMOVED }),
      );
      await expectError(
        service.getById('p1'),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      await expectError(
        service.getById('p1', other),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('shows a removed post to its author and to admins', async () => {
      prisma.post.findUnique.mockResolvedValue(
        makePost({ status: PostStatus.REMOVED }),
      );
      await expect(service.getById('p1', user)).resolves.toMatchObject({
        status: PostStatus.REMOVED,
      });
      await expect(service.getById('p1', admin)).resolves.toMatchObject({
        status: PostStatus.REMOVED,
      });
    });

    it('reports an ACTIVE post past its date as EXPIRED', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost({ expiresAt: past }));
      await expect(service.getById('p1')).resolves.toMatchObject({
        status: PostStatus.EXPIRED,
      });
    });

    it('marks isFavorite for the logged-in viewer and never for guests', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      prisma.favorite.findMany.mockResolvedValue([{ postId: 'p1' }]);
      await expect(service.getById('p1', other)).resolves.toMatchObject({
        isFavorite: true,
      });
      await expect(service.getById('p1')).resolves.toMatchObject({
        isFavorite: false,
      });
    });

    it('never returns the author id or password hash', async () => {
      prisma.post.findUnique.mockResolvedValue(makePost());
      const result = await service.getById('p1');
      expect(result).not.toHaveProperty('authorId');
      expect(result.author).toEqual({
        username: 'aziza',
        isStudentVerified: false,
      });
    });
  });

  describe('list', () => {
    const query = (extra: Record<string, unknown> = {}) =>
      ({ page: 1, limit: 20, sort: PostSort.NEWEST, ...extra }) as Parameters<
        PostsService['list']
      >[0];

    beforeEach(() => {
      prisma.post.findMany.mockResolvedValue([makePost()]);
      prisma.post.count.mockResolvedValue(45);
    });

    it('only shows ACTIVE and RESOLVED posts that have not expired', async () => {
      await service.list(query());
      const { where } = lastArgs<{
        where: { status: { in: PostStatus[] }; expiresAt: { gt: Date } };
      }>(prisma.post.findMany);
      expect(where.status.in).toEqual([PostStatus.ACTIVE, PostStatus.RESOLVED]);
      expect(where.expiresAt.gt).toBeInstanceOf(Date);
    });

    it('applies category, district, price range and search filters', async () => {
      await service.list(
        query({
          category: Category.RENTALS,
          district: District.SINO,
          minPrice: 10,
          maxPrice: 50,
          q: 'room',
        }),
      );
      const { where } = lastArgs<{ where: Record<string, unknown> }>(
        prisma.post.findMany,
      );
      expect(where.category).toBe(Category.RENTALS);
      expect(where.district).toBe(District.SINO);
      expect(where.price).toEqual({ gte: 10, lte: 50 });
      expect(where.OR).toHaveLength(2);
    });

    it('paginates and returns totals', async () => {
      const result = await service.list(query({ page: 2, limit: 20 }));
      const args = lastArgs<{ skip: number; take: number }>(
        prisma.post.findMany,
      );
      expect(args.skip).toBe(20);
      expect(args.take).toBe(20);
      expect(result).toMatchObject({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
      expect(result.items).toHaveLength(1);
    });

    it.each([
      [PostSort.NEWEST, { createdAt: 'desc' }],
      [PostSort.OLDEST, { createdAt: 'asc' }],
      [PostSort.PRICE_ASC, { price: { sort: 'asc', nulls: 'last' } }],
      [PostSort.PRICE_DESC, { price: { sort: 'desc', nulls: 'last' } }],
    ])('sorts by %s', async (sort, first) => {
      await service.list(query({ sort }));
      const { orderBy } = lastArgs<{ orderBy: unknown[] }>(
        prisma.post.findMany,
      );
      expect(orderBy[0]).toEqual(first);
    });
  });

  describe('counts', () => {
    it('counts per category and adds them up', async () => {
      prisma.post.groupBy.mockResolvedValue([
        { category: Category.TUTORING, _count: { _all: 24 } },
        { category: Category.RENTALS, _count: { _all: 40 } },
      ]);
      await expect(service.counts({})).resolves.toEqual({
        ALL: 64,
        LOST_FOUND: 0,
        TUTORING: 24,
        RENTALS: 40,
        OTHER: 0,
      });
    });
  });

  describe('expireOverdue', () => {
    it('marks overdue ACTIVE posts as EXPIRED', async () => {
      prisma.post.updateMany.mockResolvedValue({ count: 3 });
      await expect(service.expireOverdue(true)).resolves.toBe(3);
      const args = lastArgs<{
        where: { status: PostStatus };
        data: { status: PostStatus };
      }>(prisma.post.updateMany);
      expect(args.where.status).toBe(PostStatus.ACTIVE);
      expect(args.data.status).toBe(PostStatus.EXPIRED);
    });

    it('does not run again within a minute unless forced', async () => {
      await service.expireOverdue(true);
      prisma.post.updateMany.mockClear();
      await service.expireOverdue();
      expect(prisma.post.updateMany).not.toHaveBeenCalled();
      await service.expireOverdue(true);
      expect(prisma.post.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
