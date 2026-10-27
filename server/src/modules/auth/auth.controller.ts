import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { THROTTLE } from '../../common/throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorCode } from '../../common/error-code';
import {
  JwtAuthGuard,
  ACCESS_COOKIE,
} from '../../common/guards/jwt-auth.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { accessCookieOptions } from './auth.cookie';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle(THROTTLE.register)
  @ApiOperation({
    summary: 'Create an account and log in (sets the access_token cookie)',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    409: [ErrorCode.EMAIL_TAKEN, ErrorCode.USERNAME_TAKEN],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, token } = await this.auth.register(dto);
    res.cookie(ACCESS_COOKIE, token, accessCookieOptions(this.config));
    return user;
  }

  @Post('login')
  @Throttle(THROTTLE.login)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in with email or username (sets the access_token cookie)',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.INVALID_CREDENTIALS],
    403: [ErrorCode.USER_BLOCKED],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, token } = await this.auth.login(dto);
    res.cookie(ACCESS_COOKIE, token, accessCookieOptions(this.config));
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out (clears the access_token cookie)' })
  @ApiNoContentResponse({
    description: 'Logged out. Also fine when you were not logged in.',
  })
  logout(@Res({ passthrough: true }) res: Response): void {
    const { maxAge: _maxAge, ...options } = accessCookieOptions(this.config);
    res.clearCookie(ACCESS_COOKIE, options);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the logged-in user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({ 401: [ErrorCode.UNAUTHORIZED], 403: [ErrorCode.USER_BLOCKED] })
  me(@CurrentUser() user: AuthUser): UserResponseDto {
    return UserResponseDto.from(user);
  }
}
