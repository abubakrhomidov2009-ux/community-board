import { ApiProperty } from '@nestjs/swagger';
import {
  Category,
  District,
  Prisma,
  PriceUnit,
  PostStatus,
} from '@prisma/client';

/** What we load for every post we return. */
export const POST_INCLUDE = {
  images: { orderBy: { position: 'asc' } },
  author: { select: { username: true, isStudentVerified: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

export type PostWithRelations = Prisma.PostGetPayload<{
  include: typeof POST_INCLUDE;
}>;

export class PostImageResponseDto {
  @ApiProperty({ example: 'cm2ximg0000abc' })
  id: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
  })
  url: string;

  @ApiProperty({
    example: 0,
    description: 'Order of the image. 0 is the thumbnail.',
  })
  position: number;
}

export class PostAuthorDto {
  @ApiProperty({ example: 'aziza' })
  username: string;

  @ApiProperty({ example: false, description: 'Shows the "Student ✓" badge' })
  isStudentVerified: boolean;
}

export class PostResponseDto {
  @ApiProperty({ example: 'cm2xpost0000abc' })
  id: string;

  @ApiProperty({ example: 'Math tutor for first-year students' })
  title: string;

  @ApiProperty({
    example: 'I teach calculus and linear algebra. Free first lesson.',
  })
  description: string;

  @ApiProperty({ enum: Category, example: Category.TUTORING })
  category: Category;

  @ApiProperty({ enum: District, example: District.UNIVERSITY_CAMPUS })
  district: District;

  @ApiProperty({
    enum: PostStatus,
    example: PostStatus.ACTIVE,
    description: 'An ACTIVE post past its expiry date is reported as EXPIRED',
  })
  status: PostStatus;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 100,
    description: 'Whole somoni',
  })
  price: number | null;

  @ApiProperty({ enum: PriceUnit, nullable: true, example: PriceUnit.PER_HOUR })
  priceUnit: PriceUnit | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'aziza_tutor',
    description: 'Opens https://t.me/<username>',
  })
  contactTelegram: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '+992901234567',
    description: 'Use as a tel: link',
  })
  contactPhone: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 38.5598 })
  latitude: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 68.787 })
  longitude: number | null;

  @ApiProperty({
    example: '2026-04-01T10:00:00.000Z',
    description: 'The post expires at this time',
  })
  expiresAt: Date;

  @ApiProperty({ example: '2026-03-02T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-02T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [PostImageResponseDto] })
  images: PostImageResponseDto[];

  @ApiProperty({ type: PostAuthorDto })
  author: PostAuthorDto;

  @ApiProperty({ example: 3 })
  commentsCount: number;

  @ApiProperty({
    example: false,
    description:
      'Did the logged-in user save this post? Always false for guests.',
  })
  isFavorite: boolean;

  static from(
    post: PostWithRelations,
    isFavorite: boolean,
    now = new Date(),
  ): PostResponseDto {
    return {
      id: post.id,
      title: post.title,
      description: post.description,
      category: post.category,
      district: post.district,
      status:
        post.status === PostStatus.ACTIVE && post.expiresAt <= now
          ? PostStatus.EXPIRED
          : post.status,
      price: post.price,
      priceUnit: post.priceUnit,
      contactTelegram: post.contactTelegram,
      contactPhone: post.contactPhone,
      latitude: post.latitude,
      longitude: post.longitude,
      expiresAt: post.expiresAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      images: post.images.map(({ id, url, position }) => ({
        id,
        url,
        position,
      })),
      author: {
        username: post.author.username,
        isStudentVerified: post.author.isStudentVerified,
      },
      commentsCount: post._count.comments,
      isFavorite,
    };
  }
}

export class PaginatedPostsResponseDto {
  @ApiProperty({ type: [PostResponseDto] })
  items: PostResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 45, description: 'Total posts matching the filters' })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class PostCountsResponseDto {
  @ApiProperty({ example: 120, description: 'All categories together' })
  ALL: number;

  @ApiProperty({ example: 18 })
  LOST_FOUND: number;

  @ApiProperty({ example: 24 })
  TUTORING: number;

  @ApiProperty({ example: 40 })
  RENTALS: number;

  @ApiProperty({ example: 38 })
  OTHER: number;
}

export class MapPinResponseDto {
  @ApiProperty({ example: 'cm2xpost0000abc' })
  id: string;

  @ApiProperty({ example: '2-room apartment near the university' })
  title: string;

  @ApiProperty({ enum: Category, example: Category.RENTALS })
  category: Category;

  @ApiProperty({ example: 38.5598 })
  latitude: number;

  @ApiProperty({ example: 68.787 })
  longitude: number;

  @ApiProperty({ type: Number, nullable: true, example: 1500 })
  price: number | null;

  @ApiProperty({
    enum: PriceUnit,
    nullable: true,
    example: PriceUnit.PER_MONTH,
  })
  priceUnit: PriceUnit | null;
}
