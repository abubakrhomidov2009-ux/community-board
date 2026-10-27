import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({
    example: 'aziza@example.com',
    description: 'Must be unique',
    maxLength: 254,
  })
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({
    example: 'aziza',
    description:
      'Unique. 3-20 characters: a-z, 0-9, underscore, dot. Saved in lowercase.',
    minLength: 3,
    maxLength: 20,
  })
  @Transform(lowerTrim)
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-z0-9_.]+$/)
  username: string;

  @ApiProperty({
    example: 'Demo12345',
    description: '8-72 characters, at least one letter and one digit',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @Length(8, 72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  password: string;

  @ApiPropertyOptional({
    enum: Locale,
    example: Locale.EN,
    default: Locale.EN,
    description: 'Language of the user',
  })
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}
