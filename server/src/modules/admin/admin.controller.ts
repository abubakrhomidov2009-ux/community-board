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
  AdminPostDetailResponseDto,
  AdminPostResponseDto,
  AdminPostsQueryDto,
  AdminReportResponseDto,
  AdminReportsQueryDto,
  AdminStatsResponseDto,
  AdminUserDetailResponseDto,
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
const POST_ID = {
  name: 'id',
  description: 'Post id',
  example: 'cm2xpost0000abc',
};
const USER_ID = {
  name: 'id',
  description: 'User id (not the username)',
  example: 'cm2xuser0000abc',
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

  @Get('posts/:id')
  @ApiParam(POST_ID)
  @ApiOperation({
    summary:
      '(Admin) One post with all its reports and a summary of its author',
    description:
      'Works for any status, including removed and expired posts. This feeds the admin post page.',
  })
  @ApiOkResponse({ type: AdminPostDetailResponseDto })
  @ApiErrors({ ...NOT_ADMIN, 404: [ErrorCode.POST_NOT_FOUND] })
  getPost(@Param('id') id: string): Promise<AdminPostDetailResponseDto> {
    return this.admin.getPostDetail(id);
  }

  @Patch('posts/:id/remove')
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: '(Admin) Remove a post',
    description:
      'The post disappears from public lists and pages. Its open reports are marked RESOLVED and the author gets a POST_REMOVED notification. Only the super admin may remove the post of an admin.',
  })
  @ApiOkResponse({ type: AdminPostResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED],
    401: [ErrorCode.UNAUTHORIZED],
    403: [
      ErrorCode.ADMIN_ONLY,
      ErrorCode.USER_BLOCKED,
      ErrorCode.FORBIDDEN_ROLE,
      ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
    ],
    404: [ErrorCode.POST_NOT_FOUND],
  })
  removePost(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RemovePostDto,
  ): Promise<AdminPostResponseDto> {
    return this.admin.removePost(admin, id, dto);
  }

  @Patch('posts/:id/restore')
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: '(Admin) Restore a removed post',
    description: 'Only the super admin may restore the post of an admin.',
  })
  @ApiOkResponse({ type: AdminPostResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [
      ErrorCode.ADMIN_ONLY,
      ErrorCode.USER_BLOCKED,
      ErrorCode.FORBIDDEN_ROLE,
      ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
    ],
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.POST_NOT_ACTIVE],
  })
  restorePost(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminPostResponseDto> {
    return this.admin.restorePost(admin, id);
  }

  @Patch('posts/:id/reports/dismiss')
  @ApiParam(POST_ID)
  @ApiOperation({
    summary: '(Admin) Dismiss all open reports on a post',
    description:
      'The post stays as it is. Returns the post page data with the updated reports.',
  })
  @ApiOkResponse({ type: AdminPostDetailResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [
      ErrorCode.ADMIN_ONLY,
      ErrorCode.USER_BLOCKED,
      ErrorCode.FORBIDDEN_ROLE,
      ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
    ],
    404: [ErrorCode.POST_NOT_FOUND],
  })
  dismissReports(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminPostDetailResponseDto> {
    return this.admin.dismissReports(admin, id);
  }

  @Get('users')
  @ApiOperation({
    summary:
      '(Admin) List users, with search, role and blocked filters, sort and pagination',
  })
  @ApiOkResponse({ type: PaginatedAdminUsersResponseDto })
  @ApiErrors({ 400: [ErrorCode.VALIDATION_FAILED], ...NOT_ADMIN })
  listUsers(
    @Query() query: AdminUsersQueryDto,
  ): Promise<PaginatedAdminUsersResponseDto> {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @ApiParam(USER_ID)
  @ApiOperation({
    summary: '(Admin) One user with counts and their posts',
    description:
      'Includes the email. Counts: posts, reports on their posts, comments, removed posts. Lists their latest 50 posts. This feeds the admin user page.',
  })
  @ApiOkResponse({ type: AdminUserDetailResponseDto })
  @ApiErrors({ ...NOT_ADMIN, 404: [ErrorCode.USER_NOT_FOUND] })
  getUser(@Param('id') id: string): Promise<AdminUserDetailResponseDto> {
    return this.admin.getUserDetail(id);
  }

  @Patch('users/:id/block')
  @ApiParam(USER_ID)
  @ApiOperation({
    summary: '(Admin) Block a user',
    description:
      'A blocked user cannot log in or use the site. An admin can block normal users only. Only the super admin can block an admin. Nobody can block the super admin.',
  })
  @ApiOkResponse({ type: AdminUserResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [
      ErrorCode.ADMIN_ONLY,
      ErrorCode.USER_BLOCKED,
      ErrorCode.FORBIDDEN_ROLE,
      ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
    ],
    404: [ErrorCode.USER_NOT_FOUND],
  })
  blockUser(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminUserResponseDto> {
    return this.admin.blockUser(admin, id);
  }

  @Patch('users/:id/unblock')
  @ApiParam(USER_ID)
  @ApiOperation({
    summary: '(Admin) Unblock a user',
    description: 'Same rules as blocking.',
  })
  @ApiOkResponse({ type: AdminUserResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [
      ErrorCode.ADMIN_ONLY,
      ErrorCode.USER_BLOCKED,
      ErrorCode.FORBIDDEN_ROLE,
      ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
    ],
    404: [ErrorCode.USER_NOT_FOUND],
  })
  unblockUser(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminUserResponseDto> {
    return this.admin.unblockUser(admin, id);
  }

  @Patch('users/:id/promote')
  @Roles(Role.SUPER_ADMIN)
  @ApiParam(USER_ID)
  @ApiOperation({
    summary: '(Super admin) Make a user an admin',
    description: 'USER becomes ADMIN. Only the super admin can do this.',
  })
  @ApiOkResponse({ type: AdminUserResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [
      ErrorCode.FORBIDDEN_ROLE,
      ErrorCode.USER_BLOCKED,
      ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
    ],
    404: [ErrorCode.USER_NOT_FOUND],
    409: [ErrorCode.USER_ALREADY_ADMIN],
  })
  promoteUser(@Param('id') id: string): Promise<AdminUserResponseDto> {
    return this.admin.promoteUser(id);
  }

  @Patch('users/:id/demote')
  @Roles(Role.SUPER_ADMIN)
  @ApiParam(USER_ID)
  @ApiOperation({
    summary: '(Super admin) Remove the admin role of an admin',
    description: 'ADMIN becomes USER. Only the super admin can do this.',
  })
  @ApiOkResponse({ type: AdminUserResponseDto })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [
      ErrorCode.FORBIDDEN_ROLE,
      ErrorCode.USER_BLOCKED,
      ErrorCode.CANNOT_CHANGE_SUPER_ADMIN,
    ],
    404: [ErrorCode.USER_NOT_FOUND],
    409: [ErrorCode.USER_NOT_ADMIN],
  })
  demoteUser(@Param('id') id: string): Promise<AdminUserResponseDto> {
    return this.admin.demoteUser(id);
  }
}
