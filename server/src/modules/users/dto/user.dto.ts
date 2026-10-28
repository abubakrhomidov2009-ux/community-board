import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export class PublicUserResponseDto {
  @ApiProperty({ example: 'aziza' })
  username: string;

  @ApiProperty({
    example: null,
    nullable: true,
    type: String,
    description: 'Profile picture, or null when the user has none',
  })
  avatarUrl: string | null;

  @ApiProperty({
    example: '2026-03-01T10:00:00.000Z',
    description: 'Join date',
  })
  createdAt: Date;

  @ApiProperty({ example: false, description: 'Shows the "Student ✓" badge' })
  isStudentVerified: boolean;

  @ApiProperty({
    example: 4,
    description: 'Number of visible (active, not expired) posts',
  })
  activePostsCount: number;
}

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'aziza_d',
    description:
      'New username. Unique. 3-20 characters: a-z, 0-9, underscore, dot. Saved in lowercase.',
    minLength: 3,
    maxLength: 20,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-z0-9_.]+$/)
  username?: string;

  @ApiPropertyOptional({
    enum: Locale,
    example: Locale.TG,
    description: 'Language saved in the profile',
  })
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}
