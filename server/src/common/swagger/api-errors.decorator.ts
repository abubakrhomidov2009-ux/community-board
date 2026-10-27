import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { ErrorCode } from '../error-code';

/**
 * Documents error responses with the shared error DTO. Each status gets its own example.
 * Example: @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED], 409: [ErrorCode.EMAIL_TAKEN] })
 */
export function ApiErrors(errors: Record<number, ErrorCode[]>) {
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ...Object.entries(errors).map(([status, codes]) =>
      ApiResponse({
        status: Number(status),
        description: `Error codes: ${codes.join(', ')}`,
        schema: {
          allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
          example: {
            statusCode: Number(status),
            errorCode: codes[0],
            message: codes[0],
            details:
              codes[0] === ErrorCode.VALIDATION_FAILED
                ? [{ field: 'password', code: 'minLength' }]
                : null,
          },
        },
      }),
    ),
  );
}
