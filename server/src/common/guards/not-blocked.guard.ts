import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../app.exception';
import { ErrorCode } from '../error-code';
import { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Extra safety on endpoints that create content. JwtAuthGuard already refuses blocked users;
 * this guard keeps the rule explicit even if a route is ever reached without it.
 */
@Injectable()
export class NotBlockedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    if (user.isBlocked) {
      throw new AppException(ErrorCode.USER_BLOCKED, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
