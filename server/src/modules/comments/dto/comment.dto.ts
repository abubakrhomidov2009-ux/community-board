import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { PostAuthorDto } from '../../posts/dto/post-response.dto';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Is this still available?',
    minLength: 1,
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 1000)
  body: string;
}

export class CommentResponseDto {
  @ApiProperty({ example: 'cm2xcomment0000abc' })
  id: string;

  @ApiProperty({ example: 'Is this still available?' })
  body: string;

  @ApiProperty({ example: 'cm2xpost0000abc' })
  postId: string;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: PostAuthorDto })
  author: PostAuthorDto;
}

export class PaginatedCommentsResponseDto {
  @ApiProperty({ type: [CommentResponseDto], description: 'Oldest first' })
  items: CommentResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
