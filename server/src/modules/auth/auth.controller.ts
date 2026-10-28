import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
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
import type { Request, Response } from 'express';
import { THROTTLE } from '../../common/throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  clearSessionCookies,
  REFRESH_COOKIE,
  setSessionCookies,
} from './auth.cookie';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
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
    summary:
      'Create an account and log in (sets the access_token and refresh_token cookies)',
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
    const { user, ...tokens } = await this.auth.register(dto);
    setSessionCookies(res, this.config, tokens);
    return user;
  }

  @Post('login')
  @Throttle(THROTTLE.login)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Log in with email or username (sets the access_token and refresh_token cookies)',
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
    const { user, ...tokens } = await this.auth.login(dto);
    setSessionCookies(res, this.config, tokens);
    return user;
  }

  @Post('refresh')
  @Throttle(THROTTLE.refresh)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a new login token with the refresh_token cookie',
    description:
      'The login token (access_token) lasts 15 minutes. When any request answers 401 UNAUTHORIZED, call this once and repeat the request. The refresh token is replaced on every call. If this answers 401 REFRESH_TOKEN_INVALID, the user must log in again.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    401: [ErrorCode.REFRESH_TOKEN_INVALID],
    403: [ErrorCode.USER_BLOCKED],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const { user, ...tokens } = await this.auth.refresh(
      cookies?.[REFRESH_COOKIE],
    );
    setSessionCookies(res, this.config, tokens);
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Log out (ends this session and clears both cookies)',
  })
  @ApiNoContentResponse({
    description: 'Logged out. Also fine when you were not logged in.',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, string> | undefined;
    await this.auth.logout(cookies?.[REFRESH_COOKIE]);
    clearSessionCookies(res, this.config);
  }

  @Post('change-password')
  @Throttle(THROTTLE.changePassword)
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Change my password',
    description:
      'Needs my current password. All my other devices are logged out; this one stays logged in with new cookies.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED, ErrorCode.CURRENT_PASSWORD_INCORRECT],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user: updated, ...tokens } = await this.auth.changePassword(
      user,
      dto,
    );
    setSessionCookies(res, this.config, tokens);
    return updated;
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
