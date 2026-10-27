import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import {
  PaginatedNotificationsResponseDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications (newest first)' })
  @ApiOkResponse({ type: PaginatedNotificationsResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
  })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    return this.notifications.list(user, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Number of unread notifications (for the badge in the header)',
  })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  @ApiErrors({ 401: [ErrorCode.UNAUTHORIZED], 403: [ErrorCode.USER_BLOCKED] })
  unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCountResponseDto> {
    return this.notifications.unreadCount(user);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiNoContentResponse({ description: 'Done' })
  @ApiErrors({ 401: [ErrorCode.UNAUTHORIZED], 403: [ErrorCode.USER_BLOCKED] })
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notifications.markAllRead(user);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    description: 'Notification id',
    example: 'cm2xnotif0000abc',
  })
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiNoContentResponse({ description: 'Done' })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.NOTIFICATION_NOT_FOUND],
  })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.notifications.markRead(user, id);
  }
}
