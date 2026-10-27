import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Category, District, PostStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MAX_PRICE } from '../posts.constants';

export enum PostSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

/** Filters shared by the list, counts and map endpoints. */
export class PostFiltersDto {
  @ApiPropertyOptional({
    example: 'math',
    maxLength: 100,
    description: 'Search in title and description (not case sensitive)',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: District, example: District.SINO })
  @IsOptional()
  @IsEnum(District)
  district?: District;

  @ApiPropertyOptional({
    example: 50,
    minimum: 0,
    description: 'Minimum price in somoni',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 500,
    minimum: 0,
    description: 'Maximum price in somoni',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  maxPrice?: number;
}

export class ListPostsQueryDto extends IntersectionType(
  PostFiltersDto,
  PaginationQueryDto,
) {
  @ApiPropertyOptional({ enum: Category, example: Category.TUTORING })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiPropertyOptional({
    enum: PostSort,
    default: PostSort.NEWEST,
    description: 'Posts without a price come last when sorting by price',
  })
  @IsOptional()
  @IsEnum(PostSort)
  sort: PostSort = PostSort.NEWEST;
}

/** Counts per category: the same filters as the list, without category and sort. */
export class PostCountsQueryDto extends PostFiltersDto {}

/** Map pins: the same filters as the list, without sort and paging. */
export class PostMapQueryDto extends PostFiltersDto {
  @ApiPropertyOptional({ enum: Category, example: Category.RENTALS })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;
}

export class MyPostsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: PostStatus,
    description: 'Only posts with this status',
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
