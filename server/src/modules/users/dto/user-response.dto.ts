import { ApiProperty } from '@nestjs/swagger';
import { Locale, Role } from '@prisma/client';
import type { AuthUser } from '../../../common/types/authenticated-request';

export class UserResponseDto {
  @ApiProperty({ example: 'cm2x1abcd0000xyz123456789' })
  id: string;

  @ApiProperty({ example: 'aziza@example.com' })
  email: string;

  @ApiProperty({ example: 'aziza', description: 'Unique, lowercase' })
  username: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({
    example: false,
    description: 'True after the university email is verified ("Student ✓")',
  })
  isStudentVerified: boolean;

  @ApiProperty({
    example: null,
    nullable: true,
    type: String,
    description: 'The university email, if one was added',
  })
  universityEmail: string | null;

  @ApiProperty({
    enum: Locale,
    example: Locale.EN,
    description: 'Language saved in the profile',
  })
  preferredLocale: Locale;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
  createdAt: Date;

  static from(user: AuthUser): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isStudentVerified: user.isStudentVerified,
      universityEmail: user.universityEmail,
      preferredLocale: user.preferredLocale,
      createdAt: user.createdAt,
    };
  }
}
