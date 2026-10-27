import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
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
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { PaginatedPostsResponseDto } from '../posts/dto/post-response.dto';
import { FavoritesService } from './favorites.service';

const POST_ID = {
  name: 'id',
  description: 'Post id',
  example: 'cm2xpost0000abc',
};

@ApiTags('Favorites')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get('favorites')
  @ApiOperation({ summary: 'My saved posts (newest save first)' })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
  })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedPostsResponseDto> {
    return this.favorites.list(user, query);
  }

  @Put('posts/:id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam(POST_ID)
  @ApiOperation({ summary: 'Save a post (the heart). Saving twice is fine.' })
  @ApiNoContentResponse({ description: 'Saved' })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
  })
  add(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.favorites.add(user, id);
  }

  @Delete('posts/:id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: 'Remove a post from my saved posts. Removing twice is fine.',
  })
  @ApiNoContentResponse({ description: 'Removed' })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.favorites.remove(user, id);
  }
}
