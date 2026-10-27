import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PostStatus } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import {
  getUniversityDomains,
  isUniversityEmail,
} from '../../config/university-domains';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaginatedPostsResponseDto } from '../posts/dto/post-response.dto';
import { PostsService } from '../posts/posts.service';
import { PublicUserResponseDto, UpdateMeDto } from './dto/user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  RequestUniversityEmailDto,
  VerifyUniversityEmailDto,
} from './dto/university-email.dto';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Only a hash of the token is stored, so a copy of the database cannot be used to verify emails. */
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
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

  /** Sends a verification link to a university email. Nothing is saved on the user until the link is used. */
  async requestUniversityEmail(
    user: AuthUser,
    dto: RequestUniversityEmailDto,
  ): Promise<void> {
    if (user.isStudentVerified) {
      throw new AppException(ErrorCode.ALREADY_VERIFIED, HttpStatus.CONFLICT);
    }
    const domains = getUniversityDomains(
      this.config.get<string>('ALLOWED_UNIVERSITY_DOMAINS'),
    );
    if (!isUniversityEmail(dto.universityEmail, domains)) {
      throw new AppException(
        ErrorCode.UNIVERSITY_DOMAIN_NOT_ALLOWED,
        HttpStatus.BAD_REQUEST,
      );
    }
    const taken = await this.prisma.user.findFirst({
      where: { universityEmail: dto.universityEmail, id: { not: user.id } },
      select: { id: true },
    });
    if (taken) {
      throw new AppException(
        ErrorCode.UNIVERSITY_EMAIL_TAKEN,
        HttpStatus.CONFLICT,
      );
    }

    // Only the newest link works: older unused links are removed.
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    const token = randomBytes(32).toString('hex');
    const saved = await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        universityEmail: dto.universityEmail,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
      select: { id: true },
    });

    const siteUrl = (
      this.config.get<string>('SITE_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    const locale = user.preferredLocale.toLowerCase();
    try {
      await this.mail.sendVerificationEmail({
        to: dto.universityEmail,
        username: user.username,
        locale: user.preferredLocale,
        link: `${siteUrl}/${locale}/settings/verify-email?token=${token}`,
      });
    } catch (error) {
      // No email went out, so the token is useless.
      await this.prisma.emailVerificationToken.delete({
        where: { id: saved.id },
      });
      throw error;
    }
  }

  /** Checks the token from the email link and gives the user the "Student ✓" badge. */
  async verifyUniversityEmail(
    user: AuthUser,
    dto: VerifyUniversityEmailDto,
  ): Promise<UserResponseDto> {
    if (user.isStudentVerified) {
      throw new AppException(ErrorCode.ALREADY_VERIFIED, HttpStatus.CONFLICT);
    }
    // Only the account that asked for the link can use it.
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash: hashToken(dto.token), userId: user.id },
    });
    if (!record || record.usedAt) {
      throw new AppException(
        ErrorCode.VERIFICATION_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (record.expiresAt <= new Date()) {
      throw new AppException(
        ErrorCode.VERIFICATION_TOKEN_EXPIRED,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.emailVerificationToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            universityEmail: record.universityEmail,
            isStudentVerified: true,
          },
        }),
      ]);
      const { passwordHash: _passwordHash, ...safeUser } = updated;
      return UserResponseDto.from(safeUser);
    } catch (error) {
      // Someone else verified the same university email in the meantime.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          ErrorCode.UNIVERSITY_EMAIL_TAKEN,
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
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
