import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../app.exception';
import { ErrorCode } from '../error-code';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest, AuthUser } from '../types/authenticated-request';

export const ACCESS_COOKIE = 'access_token';

/**
 * Reads the JWT from the httpOnly cookie, loads the user from the database (so the role and
 * blocked flag are always fresh) and attaches it to the request.
 * Refuses blocked users on every request, not only at login.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    protected readonly jwt: JwtService,
    protected readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.loadUser(request);
    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    if (user.isBlocked) {
      throw new AppException(ErrorCode.USER_BLOCKED, HttpStatus.FORBIDDEN);
    }
    request.user = user;
    return true;
  }

  /** Returns the user for a valid token, or null when there is no token / it is invalid / the user is gone. */
  protected async loadUser(
    request: AuthenticatedRequest,
  ): Promise<AuthUser | null> {
    const token = request.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) return null;

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      userId = payload.sub;
    } catch {
      return null;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    // Never keep the password hash on the request.
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
