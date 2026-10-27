import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException, ErrorDetail } from '../app.exception';
import { ErrorCode } from '../error-code';

function flatten(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.keys(error.constraints ?? {}).map((code) => ({
      field,
      code,
    }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

/** Global validation: strips unknown fields, rejects extra ones, returns the shared error format. */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'Validation failed',
        flatten(errors),
      ),
  });
}
