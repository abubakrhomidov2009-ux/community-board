import { ApiProperty } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class PublicUserResponseDto {
  @ApiProperty({ example: 'aziza' })
  username: string;

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
  @ApiProperty({
    enum: Locale,
    example: Locale.TG,
    description: 'Language saved in the profile',
  })
  @IsEnum(Locale)
  preferredLocale: Locale;
}
