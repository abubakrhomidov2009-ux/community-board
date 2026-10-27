import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../error-code';

export class ErrorDetailDto {
  @ApiProperty({
    example: 'password',
    description: 'The field that failed validation',
  })
  field: string;

  @ApiProperty({
    example: 'minLength',
    description: 'The validation rule that failed',
  })
  code: string;
}

/** The shared error format returned by every endpoint. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    enum: ErrorCode,
    example: ErrorCode.POST_NOT_FOUND,
    description:
      'Stable error code. The frontend translates it; do not show `message` to users.',
  })
  errorCode: ErrorCode;

  @ApiProperty({
    example: 'POST_NOT_FOUND',
    description: 'Short hint for developers (English)',
  })
  message: string;

  @ApiPropertyOptional({
    type: [ErrorDetailDto],
    nullable: true,
    description: 'Field-level problems (only for VALIDATION_FAILED)',
  })
  details: ErrorDetailDto[] | null;
}
