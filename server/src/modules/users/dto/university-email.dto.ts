import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class RequestUniversityEmailDto {
  @ApiProperty({
    example: 'name@students.university.tj',
    maxLength: 254,
    description:
      'Must end with an allowed university domain (see server/src/config/university-domains.ts)',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  universityEmail: string;
}

export class VerifyUniversityEmailDto {
  @ApiProperty({
    example: '3f9a1c0d5b7e4a2f8c6d1e9b0a3c5d7f2e4b6a8c0d1e3f5a7b9c2d4e6f8a0b1c',
    description: 'The token from the link in the email',
  })
  @IsString()
  @Length(20, 200)
  token: string;
}
