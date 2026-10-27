import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category, District, PriceUnit } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MAX_PRICE } from '../posts.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value === '' ? null : value;

/** "@name" or " name " becomes "name"; an empty value becomes null. */
const telegram = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? emptyToNull(value.trim().replace(/^@/, ''))
    : value;

/** Removes spaces, dashes and brackets: "+992 (90) 123-45-67" becomes "+992901234567". */
const phone = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? emptyToNull(value.replace(/[\s\-()]/g, ''))
    : value;

export class CreatePostDto {
  @ApiProperty({
    example: 'Math tutor for first-year students',
    minLength: 5,
    maxLength: 120,
  })
  @Transform(trim)
  @IsString()
  @Length(5, 120)
  title: string;

  @ApiProperty({
    example:
      'I teach calculus and linear algebra. Online or at the university library. Free first lesson.',
    minLength: 10,
    maxLength: 5000,
  })
  @Transform(trim)
  @IsString()
  @Length(10, 5000)
  description: string;

  @ApiProperty({ enum: Category, example: Category.TUTORING })
  @IsEnum(Category)
  category: Category;

  @ApiProperty({ enum: District, example: District.UNIVERSITY_CAMPUS })
  @IsEnum(District)
  district: District;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 100,
    minimum: 0,
    maximum: MAX_PRICE,
    description:
      'Whole somoni. Only for TUTORING and RENTALS (otherwise PRICE_NOT_ALLOWED). Needs priceUnit.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number | null;

  @ApiPropertyOptional({
    enum: PriceUnit,
    nullable: true,
    example: PriceUnit.PER_HOUR,
    description: 'Required when price is set (otherwise PRICE_UNIT_REQUIRED)',
  })
  @IsOptional()
  @IsEnum(PriceUnit)
  priceUnit?: PriceUnit | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'aziza_tutor',
    description:
      'Telegram username without @ (5-32 letters, digits, underscore). Telegram or phone is required.',
  })
  @Transform(telegram)
  @IsOptional()
  @Matches(/^[A-Za-z0-9_]{5,32}$/)
  contactTelegram?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+992901234567',
    description:
      '7-15 digits, optional leading +. Spaces and dashes are removed. Telegram or phone is required.',
  })
  @Transform(phone)
  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/)
  contactPhone?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 38.5598,
    description: 'Map pin latitude (-90 to 90). Send together with longitude.',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 68.787,
    description:
      'Map pin longitude (-180 to 180). Send together with latitude.',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}
