import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import { PrismaService } from '../../prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_COST = 10;
// Compared when the user does not exist, so the answer takes the same time (no user guessing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export interface AuthResult {
  user: UserResponseDto;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
        token: await this.signToken(user.id),
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
      token: await this.signToken(user.id),
    };
  }

  private signToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }
}
