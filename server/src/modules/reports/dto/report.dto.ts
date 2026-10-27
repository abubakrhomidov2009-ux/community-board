import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ReportStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ReportReason, example: ReportReason.SPAM })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'The same text is posted every day.',
    maxLength: 500,
    description: 'Optional explanation',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}

export class ReportResponseDto {
  @ApiProperty({ example: 'cm2xreport0000abc' })
  id: string;

  @ApiProperty({ example: 'cm2xpost0000abc' })
  postId: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.SPAM })
  reason: ReportReason;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'The same text is posted every day.',
  })
  details: string | null;

  @ApiProperty({ enum: ReportStatus, example: ReportStatus.OPEN })
  status: ReportStatus;

  @ApiProperty({ example: '2026-03-02T11:00:00.000Z' })
  createdAt: Date;
}
