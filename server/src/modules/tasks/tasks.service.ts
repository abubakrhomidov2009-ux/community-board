import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, PostStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DAY_MS, RENEW_WINDOW_DAYS } from '../posts/posts.constants';
import { PostsService } from '../posts/posts.service';

/** Scheduled jobs. On the free server, expiry is also checked whenever posts are read. */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
  ) {}

  /** Every day at 03:00 (server time). */
  @Cron('0 3 * * *')
  async runDaily(): Promise<void> {
    const expired = await this.posts.expireOverdue(true);
    const warned = await this.sendExpiryWarnings();
    this.logger.log(
      `Daily job: ${expired} post(s) expired, ${warned} expiry warning(s) sent`,
    );
  }

  /** Tells the author of each ACTIVE post that expires within 3 days (once per post). */
  async sendExpiryWarnings(now = new Date()): Promise<number> {
    const soon = new Date(now.getTime() + RENEW_WINDOW_DAYS * DAY_MS);
    const posts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.ACTIVE,
        expiresAt: { gt: now, lte: soon },
        expiryWarningSentAt: null,
      },
      select: { id: true, authorId: true },
    });
    if (posts.length === 0) return 0;

    await this.prisma.$transaction([
      this.prisma.notification.createMany({
        data: posts.map((post) => ({
          userId: post.authorId,
          type: NotificationType.POST_EXPIRING,
          postId: post.id,
        })),
      }),
      this.prisma.post.updateMany({
        where: { id: { in: posts.map((post) => post.id) } },
        data: { expiryWarningSentAt: now },
      }),
    ]);
    return posts.length;
  }
}
