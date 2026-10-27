import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AppException } from '../app.exception';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ErrorCode } from '../error-code';
import { AuthenticatedRequest } from '../types/authenticated-request';

/** Use after JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard) with @Roles(Role.ADMIN). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    if (!required.includes(user.role)) {
      const code = required.includes(Role.ADMIN)
        ? ErrorCode.ADMIN_ONLY
        : ErrorCode.FORBIDDEN;
      throw new AppException(code, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
