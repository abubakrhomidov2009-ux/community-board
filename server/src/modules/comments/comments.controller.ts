import {
  Body,
  Controller,
  Delete,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE } from '../../common/throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotBlockedGuard } from '../../common/guards/not-blocked.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { CommentsService } from './comments.service';
import {
  CommentResponseDto,
  CreateCommentDto,
  PaginatedCommentsResponseDto,
} from './dto/comment.dto';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('posts/:postId/comments')
  @ApiParam({
    name: 'postId',
    description: 'Post id',
    example: 'cm2xpost0000abc',
  })
  @ApiOperation({
    summary: 'List comments of a post (oldest first)',
    description: 'Public.',
  })
  @ApiOkResponse({ type: PaginatedCommentsResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    404: [ErrorCode.POST_NOT_FOUND],
  })
  list(
    @Param('postId') postId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    return this.comments.list(postId, query);
  }

  @Post('posts/:postId/comments')
  @Throttle(THROTTLE.createComment)
  @UseGuards(JwtAuthGuard, NotBlockedGuard)
  @ApiCookieAuth()
  @ApiParam({
    name: 'postId',
    description: 'Post id',
    example: 'cm2xpost0000abc',
  })
  @ApiOperation({
    summary: 'Add a comment',
    description:
      'Only on ACTIVE posts. The post author is notified (added with notifications).',
  })
  @ApiCreatedResponse({ type: CommentResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.POST_NOT_ACTIVE],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  create(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.comments.create(user, postId, dto);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiParam({
    name: 'id',
    description: 'Comment id',
    example: 'cm2xcomment0000abc',
  })
  @ApiOperation({ summary: 'Delete a comment (its author, or an admin)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.COMMENT_NOT_OWNER, ErrorCode.USER_BLOCKED],
    404: [ErrorCode.COMMENT_NOT_FOUND],
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.comments.remove(user, id);
  }
}
