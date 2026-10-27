import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { ErrorCode } from '../error-code';

/**
 * Documents error responses with the shared error DTO.
 * Example: @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED], 409: [ErrorCode.EMAIL_TAKEN] })
 */
export function ApiErrors(errors: Record<number, ErrorCode[]>) {
  return applyDecorators(
    ...Object.entries(errors).map(([status, codes]) =>
      ApiResponse({
        status: Number(status),
        description: `Error codes: ${codes.join(', ')}`,
        type: ErrorResponseDto,
      }),
    ),
  );
}
