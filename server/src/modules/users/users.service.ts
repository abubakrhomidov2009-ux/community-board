import { HttpStatus, Injectable } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedPostsResponseDto } from '../posts/dto/post-response.dto';
import { PostsService } from '../posts/posts.service';
import { PublicUserResponseDto, UpdateMeDto } from './dto/user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
  ) {}

  async getPublic(username: string): Promise<PublicUserResponseDto> {
    const user = await this.findPublicUser(username);
    const activePostsCount = await this.prisma.post.count({
      where: {
        authorId: user.id,
        status: PostStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });
    return {
      username: user.username,
      createdAt: user.createdAt,
      isStudentVerified: user.isStudentVerified,
      activePostsCount,
    };
  }

  async listPosts(
    username: string,
    query: PaginationQueryDto,
    viewer?: AuthUser,
  ): Promise<PaginatedPostsResponseDto> {
    const user = await this.findPublicUser(username);
    return this.posts.listByAuthor(user.id, query, viewer);
  }

  async updateMe(user: AuthUser, dto: UpdateMeDto): Promise<UserResponseDto> {
    const { passwordHash: _passwordHash, ...updated } =
      await this.prisma.user.update({
        where: { id: user.id },
        data: { preferredLocale: dto.preferredLocale },
      });
    return UserResponseDto.from(updated);
  }

  /** Blocked users have no public profile (same answer as an unknown name). */
  private async findPublicUser(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        createdAt: true,
        isStudentVerified: true,
        isBlocked: true,
      },
    });
    if (!user || user.isBlocked) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return user;
  }
}
