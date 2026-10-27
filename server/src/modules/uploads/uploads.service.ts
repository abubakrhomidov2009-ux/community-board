import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { PostImageResponseDto } from '../posts/dto/post-response.dto';
import { CloudinaryService, UploadedImage } from './cloudinary.service';
import { isAllowedImage } from './image-signature';

export const MAX_IMAGES_PER_POST = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async addImages(
    user: AuthUser,
    postId: string,
    files: Express.Multer.File[] | undefined,
  ): Promise<PostImageResponseDto[]> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        status: true,
        images: { select: { position: true } },
      },
    });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (post.authorId !== user.id) {
      throw new AppException(ErrorCode.POST_NOT_OWNER, HttpStatus.FORBIDDEN);
    }
    if (post.status === PostStatus.REMOVED) {
      throw new AppException(ErrorCode.POST_NOT_ACTIVE, HttpStatus.CONFLICT);
    }
    if (!files || files.length === 0) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'No files were sent',
        [{ field: 'files', code: 'isNotEmpty' }],
      );
    }

    // Check everything before uploading anything, so a bad file never leaves a half-finished post.
    if (post.images.length + files.length > MAX_IMAGES_PER_POST) {
      throw new AppException(
        ErrorCode.IMAGE_LIMIT_EXCEEDED,
        HttpStatus.BAD_REQUEST,
      );
    }
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        throw new AppException(
          ErrorCode.IMAGE_TOO_LARGE,
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }
      if (!isAllowedImage(file.mimetype, file.buffer)) {
        throw new AppException(
          ErrorCode.IMAGE_TYPE_INVALID,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const uploaded = await this.uploadAll(files);
    const firstPosition =
      post.images.length > 0
        ? Math.max(...post.images.map((image) => image.position)) + 1
        : 0;

    try {
      const rows = await this.prisma.$transaction(
        uploaded.map((image, index) =>
          this.prisma.postImage.create({
            data: {
              postId,
              url: image.url,
              publicId: image.publicId,
              position: firstPosition + index,
            },
            select: { id: true, url: true, position: true },
          }),
        ),
      );
      return rows;
    } catch (error) {
      await this.cloudinary.destroyMany(
        uploaded.map((image) => image.publicId),
      );
      throw error;
    }
  }

  async removeImage(
    user: AuthUser,
    postId: string,
    imageId: string,
  ): Promise<void> {
    const image = await this.prisma.postImage.findUnique({
      where: { id: imageId },
      select: {
        id: true,
        postId: true,
        publicId: true,
        post: { select: { authorId: true } },
      },
    });
    if (!image || image.postId !== postId) {
      throw new AppException(ErrorCode.IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (image.post.authorId !== user.id) {
      throw new AppException(ErrorCode.POST_NOT_OWNER, HttpStatus.FORBIDDEN);
    }
    await this.prisma.postImage.delete({ where: { id: imageId } });
    await this.cloudinary.destroyMany([image.publicId]);
  }

  /** Uploads all files. If one fails, the ones already uploaded are deleted again. */
  private async uploadAll(
    files: Express.Multer.File[],
  ): Promise<UploadedImage[]> {
    const results = await Promise.allSettled(
      files.map((file) => this.cloudinary.upload(file.buffer)),
    );
    const uploaded = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
      this.logger.error(`Image upload failed: ${String(failed.reason)}`);
      await this.cloudinary.destroyMany(
        uploaded.map((image) => image.publicId),
      );
      throw new AppException(ErrorCode.UPLOAD_FAILED, HttpStatus.BAD_GATEWAY);
    }
    return uploaded;
  }
}
