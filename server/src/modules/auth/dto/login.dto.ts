import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'aziza', description: 'Email or username' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(1, 254)
  emailOrUsername: string;

  @ApiProperty({ example: 'Demo12345' })
  @IsString()
  @Length(1, 72)
  password: string;
}
