import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code';

export interface ErrorDetail {
  field: string;
  code: string;
}

/** The one exception type services throw. The exception filter turns it into the shared error format. */
export class AppException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    status: HttpStatus,
    message?: string,
    public readonly details: ErrorDetail[] | null = null,
  ) {
    super({ errorCode, message: message ?? errorCode, details }, status);
  }
}
