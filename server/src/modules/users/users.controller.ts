import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
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
import { MAX_IMAGE_BYTES } from '../uploads/uploads.service';
import { UsersService } from './users.service';

const USERNAME = {
  name: 'username',
  description: 'Username (not case sensitive)',
  example: 'aziza',
};

@ApiTags('Users')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  @ApiOperation({
    summary: 'Edit my profile: username and/or language',
    description:
      'Send only the fields to change. Usernames are unique and saved in lowercase. The role cannot be changed here.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    409: [ErrorCode.USERNAME_TAKEN],
  })
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserResponseDto> {
    return this.users.updateMe(user, dto);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE.avatar)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'jpg, png or webp. Max 5 MB.',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Set my profile picture',
    description:
      'Replaces the old picture. It is cropped to a square around the face.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED, ErrorCode.IMAGE_TYPE_INVALID],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    413: [ErrorCode.IMAGE_TOO_LARGE],
    429: [ErrorCode.TOO_MANY_REQUESTS],
    502: [ErrorCode.UPLOAD_FAILED],
  })
  setAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserResponseDto> {
    return this.users.setAvatar(user, file);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove my profile picture' })
  @ApiNoContentResponse({
    description: 'Removed. Also fine when I had no picture.',
  })
  @ApiErrors({ 401: [ErrorCode.UNAUTHORIZED], 403: [ErrorCode.USER_BLOCKED] })
  removeAvatar(@CurrentUser() user: AuthUser): Promise<void> {
    return this.users.removeAvatar(user);
  }

  @Post('me/university-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(THROTTLE.universityEmail)
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
    summary: 'Public profile of a user (login needed)',
    description:
      'Shows username, picture, join date, student badge and the number of active posts. Never the email.',
  })
  @ApiOkResponse({ type: PublicUserResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.USER_NOT_FOUND],
  })
  getOne(@Param('username') username: string): Promise<PublicUserResponseDto> {
    return this.users.getPublic(username);
  }

  @Get(':username/posts')
  @ApiParam(USERNAME)
  @ApiOperation({
    summary: "A user's active posts (newest first)",
    description: 'Only ACTIVE, not expired posts. Login needed.',
  })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.USER_NOT_FOUND],
  })
  listPosts(
    @Param('username') username: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() viewer: AuthUser,
  ): Promise<PaginatedPostsResponseDto> {
    return this.users.listPosts(username, query, viewer);
  }
}
