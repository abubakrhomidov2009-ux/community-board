import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotBlockedGuard } from '../../common/guards/not-blocked.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import { THROTTLE } from '../../common/throttle';
import type { AuthUser } from '../../common/types/authenticated-request';
import {
  ConversationResponseDto,
  CreateConversationDto,
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  MessageResponseDto,
  PaginatedConversationsResponseDto,
  SendMessageDto,
} from './dto/message.dto';
import { MessagesService } from './messages.service';

const CONVERSATION_ID = {
  name: 'id',
  description: 'Conversation id',
  example: 'cm2xconv0000abc',
};

@ApiTags('Messages')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, NotBlockedGuard)
@Controller('conversations')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @ApiOperation({
    summary: 'My conversations (newest activity first)',
    description:
      'Each item has the other person, the last message and how many messages I have not read.',
  })
  @ApiOkResponse({ type: PaginatedConversationsResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
  })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListConversationsQueryDto,
  ): Promise<PaginatedConversationsResponseDto> {
    return this.messages.listConversations(user, query);
  }

  @Post()
  @Throttle(THROTTLE.message)
  @ApiOperation({
    summary:
      'Write to someone: start a conversation and send the first message',
    description:
      'If you already have a conversation with this person, the message is added to it.',
  })
  @ApiCreatedResponse({ type: ConversationResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED, ErrorCode.MESSAGE_SELF],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.USER_NOT_FOUND],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  start(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.messages.startConversation(user, dto);
  }

  @Get(':id/messages')
  @ApiParam(CONVERSATION_ID)
  @ApiOperation({
    summary: 'Messages of a conversation (oldest first)',
    description:
      'Without `after` you get the newest messages (up to `limit`). For polling, send `after` = the createdAt of the last message you have and you only get newer ones.',
  })
  @ApiOkResponse({ type: [MessageResponseDto] })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.CONVERSATION_NOT_FOUND],
  })
  listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<MessageResponseDto[]> {
    return this.messages.listMessages(user, id, query);
  }

  @Post(':id/messages')
  @Throttle(THROTTLE.message)
  @ApiParam(CONVERSATION_ID)
  @ApiOperation({
    summary: 'Send a message in a conversation',
    description: 'The other person gets a NEW_MESSAGE notification.',
  })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.CONVERSATION_NOT_FOUND],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messages.sendMessage(user, id, dto);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam(CONVERSATION_ID)
  @ApiOperation({
    summary: 'Mark the conversation as read (clears my unread count for it)',
  })
  @ApiNoContentResponse({ description: 'Done' })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.CONVERSATION_NOT_FOUND],
  })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.messages.markRead(user, id);
  }
}
