import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty({ example: 'cm2xnotif0000abc' })
  id: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.NEW_COMMENT,
    description:
      'The frontend writes the text in the user language from this type',
  })
  type: NotificationType;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'cm2xpost0000abc',
    description: 'Open this post',
  })
  postId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description: 'Open this conversation',
  })
  conversationId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'rustam',
    description: 'Who commented or wrote',
  })
  actorUsername: string | null;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: null,
    description: 'null means unread',
  })
  readAt: Date | null;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto], description: 'Newest first' })
  items: NotificationResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 2, description: 'Number of unread notifications' })
  count: number;
}
