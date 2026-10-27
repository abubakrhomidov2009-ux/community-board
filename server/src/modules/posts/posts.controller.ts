import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE } from '../../common/throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotBlockedGuard } from '../../common/guards/not-blocked.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { CreatePostDto } from './dto/create-post.dto';
import {
  ListPostsQueryDto,
  MyPostsQueryDto,
  PostCountsQueryDto,
  PostMapQueryDto,
} from './dto/post-query.dto';
import {
  MapPinResponseDto,
  PaginatedPostsResponseDto,
  PostCountsResponseDto,
  PostResponseDto,
} from './dto/post-response.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

const POST_ID = {
  name: 'id',
  description: 'Post id',
  example: 'cm2xpost0000abc',
};

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Browse posts: filter, search, sort, paginate',
    description:
      'Public. Shows ACTIVE and RESOLVED posts that have not expired. Log in first to get a real `isFavorite`.',
  })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED] })
  list(
    @Query() query: ListPostsQueryDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<PaginatedPostsResponseDto> {
    return this.posts.list(query, user);
  }

  @Get('counts')
  @ApiOperation({
    summary: 'Post count per category',
    description:
      'Follows the same filters as the list (search, district, price), without category and sort.',
  })
  @ApiOkResponse({ type: PostCountsResponseDto })
  @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED] })
  counts(@Query() query: PostCountsQueryDto): Promise<PostCountsResponseDto> {
    return this.posts.counts(query);
  }

  @Get('map')
  @ApiOperation({
    summary: 'Map pins: posts that have a location (max 300)',
    description: 'Same filters as the list, without sort and paging.',
  })
  @ApiOkResponse({ type: [MapPinResponseDto] })
  @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED] })
  map(@Query() query: PostMapQueryDto): Promise<MapPinResponseDto[]> {
    return this.posts.mapPins(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'My posts (all statuses, newest first)' })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
  })
  mine(
    @CurrentUser() user: AuthUser,
    @Query() query: MyPostsQueryDto,
  ): Promise<PaginatedPostsResponseDto> {
    return this.posts.listMine(user, query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: 'Get one post',
    description:
      'Public. Removed posts are only visible to their author and to admins (others get 404).',
  })
  @ApiOkResponse({ type: PostResponseDto })
  @ApiErrors({ 404: [ErrorCode.POST_NOT_FOUND] })
  getOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<PostResponseDto> {
    return this.posts.getById(id, user);
  }

  @Post()
  @Throttle(THROTTLE.createPost)
  @UseGuards(JwtAuthGuard, NotBlockedGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Create a post',
    description:
      'The post expires 30 days after creation. At least one contact (Telegram or phone) is required. ' +
      'Price and priceUnit are only allowed for TUTORING and RENTALS.',
  })
  @ApiCreatedResponse({ type: PostResponseDto })
  @ApiErrors({
    400: [
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.CONTACT_REQUIRED,
      ErrorCode.PRICE_NOT_ALLOWED,
      ErrorCode.PRICE_UNIT_REQUIRED,
    ],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.posts.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, NotBlockedGuard)
  @ApiCookieAuth()
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: 'Edit my post',
    description:
      'Only the author. Send only the fields to change. Send `null` to clear price, contacts or location.',
  })
  @ApiOkResponse({ type: PostResponseDto })
  @ApiErrors({
    400: [
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.CONTACT_REQUIRED,
      ErrorCode.PRICE_NOT_ALLOWED,
      ErrorCode.PRICE_UNIT_REQUIRED,
    ],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.POST_NOT_OWNER, ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.POST_NOT_ACTIVE],
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.posts.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiParam(POST_ID)
  @ApiOperation({ summary: 'Delete a post (the author, or an admin)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.POST_NOT_OWNER, ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.posts.remove(user, id);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, NotBlockedGuard)
  @ApiCookieAuth()
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: 'Mark my post as resolved',
    description: 'Only the author, only for an ACTIVE post.',
  })
  @ApiOkResponse({ type: PostResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.POST_NOT_OWNER, ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.POST_NOT_ACTIVE],
  })
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<PostResponseDto> {
    return this.posts.resolve(user, id);
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, NotBlockedGuard)
  @ApiCookieAuth()
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: 'Renew my post for another 30 days',
    description:
      'Only the author. Allowed when the post is EXPIRED, or ACTIVE and expiring within 3 days. The post becomes ACTIVE again.',
  })
  @ApiOkResponse({ type: PostResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.POST_NOT_OWNER, ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.RENEW_NOT_ALLOWED],
  })
  renew(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<PostResponseDto> {
    return this.posts.renew(user, id);
  }
}
