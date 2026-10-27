import {
  Body,
  Controller,
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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { AdminService } from './admin.service';
import {
  AdminPostResponseDto,
  AdminPostsQueryDto,
  AdminReportResponseDto,
  AdminReportsQueryDto,
  AdminStatsResponseDto,
  AdminUserResponseDto,
  AdminUsersQueryDto,
  PaginatedAdminPostsResponseDto,
  PaginatedAdminReportsResponseDto,
  PaginatedAdminUsersResponseDto,
  RemovePostDto,
  UpdateReportDto,
} from './dto/admin.dto';

const NOT_ADMIN = {
  401: [ErrorCode.UNAUTHORIZED],
  403: [ErrorCode.ADMIN_ONLY, ErrorCode.USER_BLOCKED],
};

@ApiTags('Admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({
    summary: '(Admin) Basic numbers: users, posts, open reports',
  })
  @ApiOkResponse({ type: AdminStatsResponseDto })
  @ApiErrors(NOT_ADMIN)
  stats(): Promise<AdminStatsResponseDto> {
    return this.admin.stats();
  }

  @Get('reports')
  @ApiOperation({
    summary: '(Admin) List reports, with filter, sort and pagination',
  })
  @ApiOkResponse({ type: PaginatedAdminReportsResponseDto })
  @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED], ...NOT_ADMIN })
  listReports(
    @Query() query: AdminReportsQueryDto,
  ): Promise<PaginatedAdminReportsResponseDto> {
    return this.admin.listReports(query);
  }

  @Patch('reports/:id')
  @ApiParam({
    name: 'id',
    description: 'Report id',
    example: 'cm2xreport0000abc',
  })
  @ApiOperation({ summary: '(Admin) Mark a report as RESOLVED or DISMISSED' })
  @ApiOkResponse({ type: AdminReportResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    ...NOT_ADMIN,
    404: [ErrorCode.REPORT_NOT_FOUND],
  })
  updateReport(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ): Promise<AdminReportResponseDto> {
    return this.admin.updateReport(id, dto);
  }

  @Get('posts')
  @ApiOperation({
    summary:
      '(Admin) List all posts (any status), with filter, search, sort and pagination',
  })
  @ApiOkResponse({ type: PaginatedAdminPostsResponseDto })
  @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED], ...NOT_ADMIN })
  listPosts(
    @Query() query: AdminPostsQueryDto,
  ): Promise<PaginatedAdminPostsResponseDto> {
    return this.admin.listPosts(query);
  }

  @Post('posts/:id/remove')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Post id', example: 'cm2xpost0000abc' })
  @ApiOperation({
    summary: '(Admin) Remove a post',
    description:
      'The post disappears from public lists and pages. Its open reports are marked RESOLVED and the author gets a POST_REMOVED notification.',
  })
  @ApiOkResponse({ type: AdminPostResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    ...NOT_ADMIN,
    404: [ErrorCode.POST_NOT_FOUND],
  })
  removePost(
    @Param('id') id: string,
    @Body() dto: RemovePostDto,
  ): Promise<AdminPostResponseDto> {
    return this.admin.removePost(id, dto);
  }

  @Post('posts/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Post id', example: 'cm2xpost0000abc' })
  @ApiOperation({ summary: '(Admin) Restore a removed post' })
  @ApiOkResponse({ type: AdminPostResponseDto })
  @ApiErrors({
    ...NOT_ADMIN,
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.POST_NOT_ACTIVE],
  })
  restorePost(@Param('id') id: string): Promise<AdminPostResponseDto> {
    return this.admin.restorePost(id);
  }

  @Get('users')
  @ApiOperation({
    summary: '(Admin) List users, with search, filter, sort and pagination',
  })
  @ApiOkResponse({ type: PaginatedAdminUsersResponseDto })
  @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED], ...NOT_ADMIN })
  listUsers(
    @Query() query: AdminUsersQueryDto,
  ): Promise<PaginatedAdminUsersResponseDto> {
    return this.admin.listUsers(query);
  }

  @Post('users/:id/block')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'User id', example: 'cm2xuser0000abc' })
  @ApiOperation({
    summary: '(Admin) Block a user',
    description:
      'A blocked user cannot log in or create anything. Admins cannot be blocked.',
  })
  @ApiOkResponse({ type: AdminUserResponseDto })
  @ApiErrors({
    400: [ErrorCode.CANNOT_BLOCK_ADMIN],
    ...NOT_ADMIN,
    404: [ErrorCode.USER_NOT_FOUND],
  })
  blockUser(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminUserResponseDto> {
    return this.admin.blockUser(admin, id);
  }

  @Post('users/:id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'User id', example: 'cm2xuser0000abc' })
  @ApiOperation({ summary: '(Admin) Unblock a user' })
  @ApiOkResponse({ type: AdminUserResponseDto })
  @ApiErrors({ ...NOT_ADMIN, 404: [ErrorCode.USER_NOT_FOUND] })
  unblockUser(@Param('id') id: string): Promise<AdminUserResponseDto> {
    return this.admin.unblockUser(id);
  }
}
