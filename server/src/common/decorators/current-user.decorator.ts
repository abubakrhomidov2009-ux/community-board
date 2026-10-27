import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, AuthUser } from '../types/authenticated-request';

/** Injects the logged-in user (set by JwtAuthGuard). Undefined on public routes without a login. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);
