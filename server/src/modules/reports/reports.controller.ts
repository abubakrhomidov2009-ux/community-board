import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorCode } from '../../common/error-code';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotBlockedGuard } from '../../common/guards/not-blocked.guard';
import { ApiErrors } from '../../common/swagger/api-errors.decorator';
import type { AuthUser } from '../../common/types/authenticated-request';
import { CreateReportDto, ReportResponseDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('posts')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post(':id/report')
  @UseGuards(JwtAuthGuard, NotBlockedGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'Post id', example: 'cm2xpost0000abc' })
  @ApiOperation({
    summary: 'Report a post',
    description:
      'One report per user per post. You cannot report your own post. Admins review reports.',
  })
  @ApiCreatedResponse({ type: ReportResponseDto })
  @ApiErrors({
    400: [ErrorCode.VALIDATION_FAILED, ErrorCode.REPORT_OWN_POST],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.REPORT_ALREADY_EXISTS],
    429: [ErrorCode.TOO_MANY_REQUESTS],
  })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    return this.reports.create(user, id, dto);
  }
}
