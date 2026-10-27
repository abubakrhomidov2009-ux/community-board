import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// ---------- requests ----------

export class CreateConversationDto {
  @ApiProperty({
    example: 'rustam',
    description:
      'Username of the person to write to. If you already have a conversation, it is reused.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 20)
  recipientUsername: string;

  @ApiProperty({
    example: 'Hi! Is the room still free?',
    minLength: 1,
    maxLength: 2000,
  })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  body: string;
}

export class SendMessageDto {
  @ApiProperty({
    example: 'Yes, you can come tomorrow at 6.',
    minLength: 1,
    maxLength: 2000,
  })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  body: string;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-02T11:00:00.000Z',
    description:
      'Only messages newer than this time. Used by polling: send the createdAt of the last message you have.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  after?: Date;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}

export class ListConversationsQueryDto extends PaginationQueryDto {}

// ---------- responses ----------

export class ChatUserDto {
  @ApiProperty({ example: 'rustam' })
  username: string;

  @ApiProperty({ example: false, description: 'Shows the "Student ✓" badge' })
  isStudentVerified: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'cm2xmsg0000abc' })
  id: string;

  @ApiProperty({ example: 'cm2xconv0000abc' })
  conversationId: string;

  @ApiProperty({ example: 'Hi! Is the room still free?' })
  body: string;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: ChatUserDto })
  sender: ChatUserDto;

  @ApiProperty({
    example: true,
    description: 'True when I sent this message (show it on the right)',
  })
  isMine: boolean;
}

export class ConversationResponseDto {
  @ApiProperty({ example: 'cm2xconv0000abc' })
  id: string;

  @ApiProperty({
    type: ChatUserDto,
    description: 'The other person in the conversation',
  })
  otherUser: ChatUserDto;

  @ApiProperty({
    type: MessageResponseDto,
    nullable: true,
    description: 'The newest message',
  })
  lastMessage: MessageResponseDto | null;

  @ApiProperty({
    example: 2,
    description: 'Messages from the other person that I have not read yet',
  })
  unreadCount: number;

  @ApiProperty({
    example: '2026-03-02T11:00:00.000Z',
    description: 'Conversations are sorted by this, newest first',
  })
  lastMessageAt: Date;
}

export class PaginatedConversationsResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  items: ConversationResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
