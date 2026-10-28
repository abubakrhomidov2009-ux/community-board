import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Demo12345', description: 'My password right now' })
  @IsString()
  @Length(1, 72)
  currentPassword: string;

  @ApiProperty({
    example: 'NewPass6789',
    description: '8-72 characters, at least one letter and one digit',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @Length(8, 72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  newPassword: string;
}
