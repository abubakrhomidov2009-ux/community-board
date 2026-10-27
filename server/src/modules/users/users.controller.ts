import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PaginatedPostsResponseDto } from '../posts/dto/post-response.dto';
import { PublicUserResponseDto, UpdateMeDto } from './dto/user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  RequestUniversityEmailDto,
  VerifyUniversityEmailDto,
} from './dto/university-email.dto';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE } from '../../common/throttle';
import { UsersService } from './users.service';

const USERNAME = {
  name: 'username',
  description: 'Username (not case sensitive)',
  example: 'aziza',
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Save my preferred language in my profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
  })
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserResponseDto> {
    return this.users.updateMe(user, dto);
  }

  @Post('me/university-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(THROTTLE.universityEmail)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Send a verification link to my university email',
    description:
      'The email is written in my preferred language. The link works for 24 hours. Only domains from the allowed list are accepted. Users should also check their spam folder.',
  })
  @ApiNoContentResponse({ description: 'The email was sent' })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED, ErrorCode.UNIVERSITY_DOMAIN_NOT_ALLOWED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    409: [ErrorCode.UNIVERSITY_EMAIL_TAKEN, ErrorCode.ALREADY_VERIFIED],
    429: [ErrorCode.TOO_MANY_REQUESTS],
    502: [ErrorCode.MAIL_SEND_FAILED],
  })
  requestUniversityEmail(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestUniversityEmailDto,
  ): Promise<void> {
    return this.users.requestUniversityEmail(user, dto);
  }

  @Post('me/university-email/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Confirm my university email with the token from the link',
    description:
      'You must be logged in as the same user who asked for the link. Gives the "Student ✓" badge.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.VERIFICATION_TOKEN_INVALID,
      ErrorCode.VERIFICATION_TOKEN_EXPIRED,
    ],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    409: [ErrorCode.ALREADY_VERIFIED, ErrorCode.UNIVERSITY_EMAIL_TAKEN],
  })
  verifyUniversityEmail(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyUniversityEmailDto,
  ): Promise<UserResponseDto> {
    return this.users.verifyUniversityEmail(user, dto);
  }

  @Get(':username')
  @ApiParam(USERNAME)
  @ApiOperation({
    summary: 'Public profile',
    description:
      'Public. Shows username, join date, student badge and the number of active posts. Never the email.',
  })
  @ApiOkResponse({ type: PublicUserResponseDto })
  @ApiErrors({ 404: [ErrorCode.USER_NOT_FOUND] })
  getOne(@Param('username') username: string): Promise<PublicUserResponseDto> {
    return this.users.getPublic(username);
  }

  @Get(':username/posts')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiParam(USERNAME)
  @ApiOperation({
    summary: "A user's active posts (newest first)",
    description: 'Public. Only ACTIVE, not expired posts.',
  })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    404: [ErrorCode.USER_NOT_FOUND],
  })
  listPosts(
    @Param('username') username: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() viewer?: AuthUser,
  ): Promise<PaginatedPostsResponseDto> {
    return this.users.listPosts(username, query, viewer);
  }
}
