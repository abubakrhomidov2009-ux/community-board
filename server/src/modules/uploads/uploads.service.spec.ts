import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Locale, PostStatus, Role } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { detectImageKind, isAllowedImage } from './image-signature';
import { MAX_IMAGE_BYTES, UploadsService } from './uploads.service';

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
const other: AuthUser = { ...user, id: 'u2', username: 'rustam' };

// The first bytes of real files.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP'),
]);
const GIF = Buffer.from('GIF89a......');

const file = (buffer: Buffer, mimetype = 'image/jpeg', size = buffer.length) =>
  ({ buffer, mimetype, size, originalname: 'photo' }) as Express.Multer.File;

describe('image-signature', () => {
  it('recognises jpeg, png and webp by their first bytes', () => {
    expect(detectImageKind(JPEG)).toBe('jpeg');
    expect(detectImageKind(PNG)).toBe('png');
    expect(detectImageKind(WEBP)).toBe('webp');
    expect(detectImageKind(GIF)).toBeNull();
  });

  it('refuses a file whose type is declared wrongly', () => {
    expect(isAllowedImage('image/jpeg', JPEG)).toBe(true);
    expect(isAllowedImage('image/png', JPEG)).toBe(false);
    expect(isAllowedImage('image/gif', GIF)).toBe(false);
    expect(
      isAllowedImage('image/jpeg', Buffer.from('<script>alert(1)</script>')),
    ).toBe(false);
  });
});

describe('UploadsService', () => {
  let service: UploadsService;
  const prisma = {
    post: { findUnique: jest.fn() },
    postImage: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };
  const cloudinary = { upload: jest.fn(), destroyMany: jest.fn() };

  const post = (overrides: Record<string, unknown> = {}) => ({
    id: 'p1',
    authorId: 'u1',
    status: PostStatus.ACTIVE,
    images: [] as { position: number }[],
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    cloudinary.destroyMany.mockResolvedValue(undefined);
    let counter = 0;
    cloudinary.upload.mockImplementation(() => {
      counter += 1;
      return Promise.resolve({
        url: `https://cdn/${counter}.jpg`,
        publicId: `pub/${counter}`,
      });
    });
    prisma.postImage.create.mockImplementation(
      ({ data }: { data: { url: string; position: number } }) => ({
        id: `img${data.position}`,
        url: data.url,
        position: data.position,
      }),
    );
    prisma.$transaction.mockImplementation((operations: unknown[]) =>
      Promise.resolve(operations),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
      ],
    }).compile();
    service = moduleRef.get(UploadsService);
  });

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

  describe('addImages', () => {
    it('uploads the files and saves url, publicId and the next positions', async () => {
      prisma.post.findUnique.mockResolvedValue(
        post({ images: [{ position: 0 }, { position: 1 }] }),
      );
      const result = await service.addImages(user, 'p1', [
        file(JPEG),
        file(PNG, 'image/png'),
      ]);
      expect(cloudinary.upload).toHaveBeenCalledTimes(2);
      expect(result.map((image) => image.position)).toEqual([2, 3]);
      const [first] = prisma.postImage.create.mock.calls[0] as unknown[] as [
        { data: { postId: string; publicId: string } },
      ];
      expect(first.data.postId).toBe('p1');
      expect(first.data.publicId).toMatch(/^pub\//);
    });

    it('throws POST_NOT_FOUND / POST_NOT_OWNER / POST_NOT_ACTIVE', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expectError(
        service.addImages(user, 'x', [file(JPEG)]),
        ErrorCode.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      prisma.post.findUnique.mockResolvedValue(post());
      await expectError(
        service.addImages(other, 'p1', [file(JPEG)]),
        ErrorCode.POST_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
      prisma.post.findUnique.mockResolvedValue(
        post({ status: PostStatus.REMOVED }),
      );
      await expectError(
        service.addImages(user, 'p1', [file(JPEG)]),
        ErrorCode.POST_NOT_ACTIVE,
        HttpStatus.CONFLICT,
      );
    });

    it('throws VALIDATION_FAILED when no file is sent', async () => {
      prisma.post.findUnique.mockResolvedValue(post());
      await expectError(
        service.addImages(user, 'p1', []),
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
      );
      await expectError(
        service.addImages(user, 'p1', undefined),
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
      );
    });

    it('throws IMAGE_LIMIT_EXCEEDED when the post would get more than 5 images', async () => {
      prisma.post.findUnique.mockResolvedValue(
        post({
          images: [
            { position: 0 },
            { position: 1 },
            { position: 2 },
            { position: 3 },
            { position: 4 },
          ],
        }),
      );
      await expectError(
        service.addImages(user, 'p1', [file(JPEG)]),
        ErrorCode.IMAGE_LIMIT_EXCEEDED,
        HttpStatus.BAD_REQUEST,
      );
      prisma.post.findUnique.mockResolvedValue(post());
      const six = Array.from({ length: 6 }, () => file(JPEG));
      await expectError(
        service.addImages(user, 'p1', six),
        ErrorCode.IMAGE_LIMIT_EXCEEDED,
        HttpStatus.BAD_REQUEST,
      );
      expect(cloudinary.upload).not.toHaveBeenCalled();
    });

    it('allows exactly 5 images', async () => {
      prisma.post.findUnique.mockResolvedValue(post());
      const five = Array.from({ length: 5 }, () => file(JPEG));
      await expect(service.addImages(user, 'p1', five)).resolves.toHaveLength(
        5,
      );
    });

    it('throws IMAGE_TYPE_INVALID for a gif or a fake extension and uploads nothing', async () => {
      prisma.post.findUnique.mockResolvedValue(post());
      await expectError(
        service.addImages(user, 'p1', [file(JPEG), file(GIF, 'image/gif')]),
        ErrorCode.IMAGE_TYPE_INVALID,
        HttpStatus.BAD_REQUEST,
      );
      await expectError(
        service.addImages(user, 'p1', [
          file(Buffer.from('not an image'), 'image/jpeg'),
        ]),
        ErrorCode.IMAGE_TYPE_INVALID,
        HttpStatus.BAD_REQUEST,
      );
      expect(cloudinary.upload).not.toHaveBeenCalled();
    });

    it('throws IMAGE_TOO_LARGE for a file over 5 MB', async () => {
      prisma.post.findUnique.mockResolvedValue(post());
      await expectError(
        service.addImages(user, 'p1', [
          file(JPEG, 'image/jpeg', MAX_IMAGE_BYTES + 1),
        ]),
        ErrorCode.IMAGE_TOO_LARGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    });

    it('throws UPLOAD_FAILED and deletes already uploaded files when Cloudinary fails', async () => {
      prisma.post.findUnique.mockResolvedValue(post());
      cloudinary.upload.mockReset();
      cloudinary.upload
        .mockResolvedValueOnce({ url: 'https://cdn/1.jpg', publicId: 'pub/1' })
        .mockRejectedValueOnce(new Error('boom'));
      await expectError(
        service.addImages(user, 'p1', [file(JPEG), file(JPEG)]),
        ErrorCode.UPLOAD_FAILED,
        HttpStatus.BAD_GATEWAY,
      );
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['pub/1']);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deletes the uploaded files again when saving to the database fails', async () => {
      prisma.post.findUnique.mockResolvedValue(post());
      prisma.$transaction.mockRejectedValue(new Error('db down'));
      await expect(service.addImages(user, 'p1', [file(JPEG)])).rejects.toThrow(
        'db down',
      );
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['pub/1']);
    });
  });

  describe('removeImage', () => {
    it('throws IMAGE_NOT_FOUND for an unknown image or one from another post', async () => {
      prisma.postImage.findUnique.mockResolvedValue(null);
      await expectError(
        service.removeImage(user, 'p1', 'x'),
        ErrorCode.IMAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
      prisma.postImage.findUnique.mockResolvedValue({
        id: 'i1',
        postId: 'p9',
        publicId: 'a',
        post: { authorId: 'u1' },
      });
      await expectError(
        service.removeImage(user, 'p1', 'i1'),
        ErrorCode.IMAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws POST_NOT_OWNER for another user', async () => {
      prisma.postImage.findUnique.mockResolvedValue({
        id: 'i1',
        postId: 'p1',
        publicId: 'a',
        post: { authorId: 'u1' },
      });
      await expectError(
        service.removeImage(other, 'p1', 'i1'),
        ErrorCode.POST_NOT_OWNER,
        HttpStatus.FORBIDDEN,
      );
      expect(prisma.postImage.delete).not.toHaveBeenCalled();
    });

    it('deletes the row and the Cloudinary file', async () => {
      prisma.postImage.findUnique.mockResolvedValue({
        id: 'i1',
        postId: 'p1',
        publicId: 'pub/a',
        post: { authorId: 'u1' },
      });
      await service.removeImage(user, 'p1', 'i1');
      expect(prisma.postImage.delete).toHaveBeenCalledWith({
        where: { id: 'i1' },
      });
      expect(cloudinary.destroyMany).toHaveBeenCalledWith(['pub/a']);
    });
  });
});
