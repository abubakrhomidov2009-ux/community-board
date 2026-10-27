import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AppException } from '../app.exception';
import { ErrorCode } from '../error-code';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return {
    status: (status.mock.calls[0] as unknown[])[0] as number,
    body: (json.mock.calls[0] as unknown[])[0] as Record<string, unknown>,
  };
}

describe('AllExceptionsFilter', () => {
  let logError: jest.SpyInstance;
  beforeEach(() => {
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('turns an AppException into the shared format', () => {
    const { status, body } = run(
      new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND),
    );
    expect(status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      errorCode: 'POST_NOT_FOUND',
      message: 'POST_NOT_FOUND',
      details: null,
    });
  });

  it('keeps the field details of validation errors', () => {
    const details = [{ field: 'password', code: 'minLength' }];
    const { status, body } = run(
      new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'Validation failed',
        details,
      ),
    );
    expect(status).toBe(400);
    expect(body).toMatchObject({ errorCode: 'VALIDATION_FAILED', details });
  });

  it.each([
    [new BadRequestException(), 400, 'VALIDATION_FAILED'],
    [new ForbiddenException(), 403, 'FORBIDDEN'],
    [new NotFoundException(), 404, 'NOT_FOUND'],
    [new ThrottlerException(), 429, 'TOO_MANY_REQUESTS'],
  ])(
    'maps a standard %# HTTP error to a stable code',
    (exception, statusCode, errorCode) => {
      const { status, body } = run(exception);
      expect(status).toBe(statusCode);
      expect(body).toMatchObject({ statusCode, errorCode, details: null });
    },
  );

  it('maps client errors that are not HttpExceptions (for example malformed JSON)', () => {
    const { status, body } = run(
      Object.assign(new SyntaxError('Unexpected token'), { status: 400 }),
    );
    expect(status).toBe(400);
    expect(body).toMatchObject({ errorCode: 'VALIDATION_FAILED' });
    expect(JSON.stringify(body)).not.toContain('Unexpected token');
  });

  it('hides everything about unexpected errors: 500 INTERNAL_ERROR, no stack, no SQL', () => {
    const { status, body } = run(
      new Error('relation "User" does not exist at SELECT * FROM secrets'),
    );
    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: null,
    });
    expect(logError).toHaveBeenCalled();
  });

  it('survives strange thrown values', () => {
    expect(run('a string').status).toBe(500);
    expect(run(undefined).status).toBe(500);
    expect(run(null).status).toBe(500);
  });
});
