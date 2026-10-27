import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException, ErrorDetail } from '../app.exception';
import { ErrorCode } from '../error-code';

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  413: ErrorCode.IMAGE_TOO_LARGE,
  429: ErrorCode.TOO_MANY_REQUESTS,
};

interface ErrorBody {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  details: ErrorDetail[] | null;
}

/** Turns every error into the shared format { statusCode, errorCode, message, details }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        errorCode: CODE_BY_STATUS[status] ?? ErrorCode.INTERNAL_ERROR,
        message: exception.message,
        details: null,
      };
    }

    // Errors from body-parser (for example malformed JSON) carry a 4xx status but are not HttpExceptions.
    const status = (exception as { status?: number } | null)?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return {
        statusCode: status,
        errorCode: CODE_BY_STATUS[status] ?? ErrorCode.VALIDATION_FAILED,
        message: 'Bad request',
        details: null,
      };
    }

    // Unexpected error: log everything, send nothing sensitive.
    this.logger.error(
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      details: null,
    };
  }
}
