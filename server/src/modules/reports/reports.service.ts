import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, PostStatus } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto, ReportResponseDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthUser,
    postId: string,
    dto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true },
    });
    if (!post || post.status === PostStatus.REMOVED) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (post.authorId === user.id) {
      throw new AppException(ErrorCode.REPORT_OWN_POST, HttpStatus.BAD_REQUEST);
    }

    try {
      const report = await this.prisma.report.create({
        data: {
          postId,
          reporterId: user.id,
          reason: dto.reason,
          details: dto.details || null,
        },
      });
      return {
        id: report.id,
        postId: report.postId,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt,
      };
    } catch (error) {
      // One report per user per post: the database enforces it with a unique key.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          ErrorCode.REPORT_ALREADY_EXISTS,
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
}
