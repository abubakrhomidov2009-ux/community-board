import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
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
