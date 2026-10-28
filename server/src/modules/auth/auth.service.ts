import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import type { AuthUser } from '../../common/types/authenticated-request';
import { hashToken } from '../../common/utils/hash-token';
import { PrismaService } from '../../prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { LoginDto } from './dto/login.dto';
import { refreshLifetimeMs } from './auth.cookie';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_COST = 10;
// Compared when the user does not exist, so the answer takes the same time (no user guessing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

// A browser can send two refresh requests at the same moment (two tabs). The token that was just
// replaced still works for this long, so the second tab is not logged out.
const REFRESH_GRACE_MS = 10 * 1000;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends SessionTokens {
  user: UserResponseDto;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      throw existing.email === dto.email
        ? new AppException(ErrorCode.EMAIL_TAKEN, HttpStatus.CONFLICT)
        : new AppException(ErrorCode.USERNAME_TAKEN, HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      const { passwordHash: _hash, ...user } = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          preferredLocale: dto.preferredLocale,
        },
      });
      return {
        user: UserResponseDto.from(user),
        ...(await this.startSession(user.id)),
      };
    } catch (error) {
      // Two people registering the same email/username at the same moment.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = JSON.stringify(error.meta?.target ?? '');
        throw new AppException(
          target.includes('username')
            ? ErrorCode.USERNAME_TAKEN
            : ErrorCode.EMAIL_TAKEN,
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const found = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.emailOrUsername }, { username: dto.emailOrUsername }],
      },
    });

    const passwordOk = await bcrypt.compare(
      dto.password,
      found?.passwordHash ?? DUMMY_HASH,
    );
    if (!found || !passwordOk) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }
    // Checked after the password, so only the real owner of the account learns it is blocked.
    if (found.isBlocked) {
      throw new AppException(ErrorCode.USER_BLOCKED, HttpStatus.FORBIDDEN);
    }

    const { passwordHash: _hash, ...user } = found;
    return {
      user: UserResponseDto.from(user),
      ...(await this.startSession(user.id)),
    };
  }

  /**
   * Trades a valid refresh token for a new login token and a new refresh token (the old one stops working).
   * A token that was already replaced and shows up again later looks stolen: every session of that user is closed.
   */
  async refresh(rawToken: string | undefined): Promise<AuthResult> {
    const invalid = () =>
      new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    if (!rawToken) throw invalid();

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });
    const now = new Date();
    // Closed for good (logout, password change...): never works again.
    if (!record || record.revokedAt || record.expiresAt <= now) throw invalid();

    if (
      record.rotatedAt &&
      now.getTime() - record.rotatedAt.getTime() > REFRESH_GRACE_MS
    ) {
      await this.revokeAll(record.userId);
      throw invalid();
    }
    if (record.user.isBlocked) {
      await this.revokeAll(record.userId);
      throw new AppException(ErrorCode.USER_BLOCKED, HttpStatus.FORBIDDEN);
    }

    if (!record.rotatedAt) {
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { rotatedAt: now },
      });
    }
    const { passwordHash: _hash, ...user } = record.user;
    return {
      user: UserResponseDto.from(user),
      ...(await this.startSession(user.id)),
    };
  }

  /** Ends this device's session. Never fails: an unknown or missing token just means there is nothing to end. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Changes my password, logs every other device out and gives this device a new session. */
  async changePassword(
    user: AuthUser,
    dto: ChangePasswordDto,
  ): Promise<AuthResult> {
    const found = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!(await bcrypt.compare(dto.currentPassword, found.passwordHash))) {
      throw new AppException(
        ErrorCode.CURRENT_PASSWORD_INCORRECT,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'Validation failed',
        [{ field: 'newPassword', code: 'isDifferent' }],
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_COST) },
    });
    await this.revokeAll(user.id);
    return {
      user: UserResponseDto.from(user),
      ...(await this.startSession(user.id)),
    };
  }

  /** Closes every session of a user (all devices). */
  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async startSession(userId: string): Promise<SessionTokens> {
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshLifetimeMs(this.config)),
      },
    });
    return {
      accessToken: await this.jwt.signAsync({ sub: userId }),
      refreshToken,
    };
  }
}
