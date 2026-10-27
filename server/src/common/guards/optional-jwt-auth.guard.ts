import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * For public endpoints that personalise the answer (for example `isFavorite`).
 * Never throws: guests and blocked users are simply treated as not logged in.
 */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.loadUser(request);
    if (user && !user.isBlocked) {
      request.user = user;
    }
    return true;
  }
}
