import type { User } from '@prisma/client';
import type { Request } from 'express';

/** The logged-in user as loaded by JwtAuthGuard (never includes the password hash). */
export type AuthUser = Omit<User, 'passwordHash'>;

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
