import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Category,
  District,
  PostStatus,
  PriceUnit,
  ReportReason,
  ReportStatus,
  Role,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PostImageResponseDto } from '../../posts/dto/post-response.dto';

export type SortOrder = 'asc' | 'desc';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

// ---------- requests ----------

export class AdminReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus, example: ReportStatus.OPEN })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({
    enum: ['createdAt', 'reason', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'reason', 'status'])
  sortBy: 'createdAt' | 'reason' | 'status' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: SortOrder = 'desc';
}

export class AdminPostsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PostStatus, example: PostStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    example: 'tutor',
    maxLength: 100,
    description: 'Search in the title',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'title', 'status', 'category'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'title', 'status', 'category'])
  sortBy: 'createdAt' | 'title' | 'status' | 'category' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: SortOrder = 'desc';
}

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'aziza',
    maxLength: 100,
    description: 'Search in username and email',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Only blocked (true) or only not blocked (false) users',
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({
    enum: ['USER', 'ADMIN'],
    description:
      'USER = normal users only. ADMIN = admins, including the super admin.',
  })
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';

  @ApiPropertyOptional({
    enum: ['createdAt', 'username', 'email'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'username', 'email'])
  sortBy: 'createdAt' | 'username' | 'email' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: SortOrder = 'desc';
}

export class UpdateReportDto {
  @ApiProperty({
    enum: [ReportStatus.RESOLVED, ReportStatus.DISMISSED],
    example: ReportStatus.DISMISSED,
  })
  @IsIn([ReportStatus.RESOLVED, ReportStatus.DISMISSED])
  status: 'RESOLVED' | 'DISMISSED';
}

export class RemovePostDto {
  @ApiPropertyOptional({
    example: 'Spam',
    maxLength: 200,
    description: 'Why the post was removed (saved with the post)',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

// ---------- responses ----------

export class AdminStatsResponseDto {
  @ApiProperty({ example: 120, description: 'All registered users' })
  users: number;

  @ApiProperty({ example: 340, description: 'All posts, any status' })
  posts: number;

  @ApiProperty({
    example: 210,
    description: 'ACTIVE posts that have not expired',
  })
  activePosts: number;

  @ApiProperty({ example: 7, description: 'Reports waiting for review' })
  reportsOpen: number;

  @ApiProperty({ example: 2 })
  blockedUsers: number;
}

class NameDto {
  @ApiProperty({
    example: 'cm2xuser0000abc',
    description: 'Use it to open the admin user page',
  })
  id: string;

  @ApiProperty({ example: 'aziza' })
  username: string;
}

class ReportedPostDto {
  @ApiProperty({ example: 'cm2xpost0000abc' })
  id: string;

  @ApiProperty({ example: 'Click here to win a free phone' })
  title: string;

  @ApiProperty({ enum: PostStatus, example: PostStatus.ACTIVE })
  status: PostStatus;

  @ApiProperty({ type: NameDto })
  author: NameDto;
}

export class AdminReportResponseDto {
  @ApiProperty({ example: 'cm2xreport0000abc' })
  id: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.SPAM })
  reason: ReportReason;

  @ApiProperty({ type: String, nullable: true, example: 'Posted every day' })
  details: string | null;

  @ApiProperty({ enum: ReportStatus, example: ReportStatus.OPEN })
  status: ReportStatus;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true, example: null })
  resolvedAt: Date | null;

  @ApiProperty({ type: ReportedPostDto })
  post: ReportedPostDto;

  @ApiProperty({ type: NameDto })
  reporter: NameDto;
}

export class AdminPostResponseDto {
  @ApiProperty({ example: 'cm2xpost0000abc' })
  id: string;

  @ApiProperty({ example: 'Math tutor for first-year students' })
  title: string;

  @ApiProperty({ enum: Category, example: Category.TUTORING })
  category: Category;

  @ApiProperty({ enum: District, example: District.SINO })
  district: District;

  @ApiProperty({ enum: PostStatus, example: PostStatus.ACTIVE })
  status: PostStatus;

  @ApiProperty({ type: String, nullable: true, example: 'Spam' })
  removedReason: string | null;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-01T11:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ type: NameDto })
  author: NameDto;

  @ApiProperty({
    example: 2,
    description: 'Reports about this post that are still OPEN',
  })
  openReportsCount: number;
}

export class AdminUserResponseDto {
  @ApiProperty({ example: 'cm2xuser0000abc' })
  id: string;

  @ApiProperty({ example: 'aziza@example.com' })
  email: string;

  @ApiProperty({ example: 'aziza' })
  username: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: false })
  isBlocked: boolean;

  @ApiProperty({ example: false })
  isStudentVerified: boolean;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 4, description: 'Number of posts of this user' })
  postsCount: number;
}

export class PaginatedAdminReportsResponseDto {
  @ApiProperty({ type: [AdminReportResponseDto] })
  items: AdminReportResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
export class PaginatedAdminPostsResponseDto {
  @ApiProperty({ type: [AdminPostResponseDto] })
  items: AdminPostResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
export class PaginatedAdminUsersResponseDto {
  @ApiProperty({ type: [AdminUserResponseDto] })
  items: AdminUserResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

// ---------- detail pages ----------

export class AdminPostReportResponseDto {
  @ApiProperty({ example: 'cm2xreport0000abc' })
  id: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.SPAM })
  reason: ReportReason;

  @ApiProperty({ type: String, nullable: true, example: 'Posted every day' })
  details: string | null;

  @ApiProperty({ enum: ReportStatus, example: ReportStatus.OPEN })
  status: ReportStatus;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true, example: null })
  resolvedAt: Date | null;

  @ApiProperty({ type: NameDto, description: 'Who reported' })
  reporter: NameDto;
}

export class AdminPostAuthorResponseDto {
  @ApiProperty({ example: 'cm2xuser0000abc' })
  id: string;

  @ApiProperty({ example: 'aziza' })
  username: string;

  @ApiProperty({ example: 'aziza@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: false })
  isBlocked: boolean;

  @ApiProperty({ example: false, description: '"Student ✓"' })
  isStudentVerified: boolean;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 4, description: 'All posts of this user' })
  postsCount: number;

  @ApiProperty({
    example: 2,
    description: 'Reports about posts of this user (any status)',
  })
  reportsOnPostsCount: number;
}

export class AdminPostDetailResponseDto {
  @ApiProperty({ example: 'cm2xpost0000abc' })
  id: string;

  @ApiProperty({ example: 'Math tutor for first-year students' })
  title: string;

  @ApiProperty({ example: 'I teach calculus and linear algebra.' })
  description: string;

  @ApiProperty({ enum: Category, example: Category.TUTORING })
  category: Category;

  @ApiProperty({ enum: District, example: District.SINO })
  district: District;

  @ApiProperty({ enum: PostStatus, example: PostStatus.ACTIVE })
  status: PostStatus;

  @ApiProperty({ type: Number, nullable: true, example: 100 })
  price: number | null;

  @ApiProperty({
    enum: PriceUnit,
    nullable: true,
    example: PriceUnit.PER_HOUR,
  })
  priceUnit: PriceUnit | null;

  @ApiProperty({ type: String, nullable: true, example: 'aziza_tutor' })
  contactTelegram: string | null;

  @ApiProperty({ type: String, nullable: true, example: '+992 900 00 00 00' })
  contactPhone: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Spam' })
  removedReason: string | null;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-01T11:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ type: [PostImageResponseDto] })
  images: PostImageResponseDto[];

  @ApiProperty({
    type: [AdminPostReportResponseDto],
    description: 'Every report on this post, newest first',
  })
  reports: AdminPostReportResponseDto[];

  @ApiProperty({ type: AdminPostAuthorResponseDto })
  author: AdminPostAuthorResponseDto;
}

export class AdminUserCountsResponseDto {
  @ApiProperty({ example: 4, description: 'All posts of this user' })
  posts: number;

  @ApiProperty({
    example: 2,
    description: 'Reports about posts of this user (any status)',
  })
  reportsOnPosts: number;

  @ApiProperty({ example: 12 })
  comments: number;

  @ApiProperty({
    example: 1,
    description: 'Posts of this user that admins removed',
  })
  removedPosts: number;
}

export class AdminUserPostResponseDto {
  @ApiProperty({ example: 'cm2xpost0000abc' })
  id: string;

  @ApiProperty({ example: 'Math tutor for first-year students' })
  title: string;

  @ApiProperty({ enum: Category, example: Category.TUTORING })
  category: Category;

  @ApiProperty({ enum: PostStatus, example: PostStatus.ACTIVE })
  status: PostStatus;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    example: 1,
    description: 'Reports about this post that are still OPEN',
  })
  openReportsCount: number;
}

export class AdminUserDetailResponseDto extends AdminUserResponseDto {
  @ApiProperty({ type: AdminUserCountsResponseDto })
  counts: AdminUserCountsResponseDto;

  @ApiProperty({
    type: [AdminUserPostResponseDto],
    description: 'Their latest 50 posts (any status), newest first',
  })
  posts: AdminUserPostResponseDto[];
}
