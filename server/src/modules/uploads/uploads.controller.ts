import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import { PostImageResponseDto } from '../posts/dto/post-response.dto';
import { MAX_IMAGE_BYTES, UploadsService } from './uploads.service';

const POST_ID = {
  name: 'id',
  description: 'Post id',
  example: 'cm2xpost0000abc',
};
// More than 5 per post is refused by the service with IMAGE_LIMIT_EXCEEDED; this only caps one request.
const MAX_FILES_PER_REQUEST = 20;

@ApiTags('Uploads')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, NotBlockedGuard)
@Controller('posts/:id/images')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_FILES_PER_REQUEST },
    }),
  )
  @ApiParam(POST_ID)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            'jpg, png or webp. Max 5 MB each. Max 5 images per post.',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Add images to my post',
    description:
      'Only the author. Up to 5 images per post in total. The first image is the thumbnail.',
  })
  @ApiCreatedResponse({ type: [PostImageResponseDto] })
  @ApiErrors({
    400: [
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.IMAGE_LIMIT_EXCEEDED,
      ErrorCode.IMAGE_TYPE_INVALID,
    ],
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.POST_NOT_OWNER, ErrorCode.USER_BLOCKED],
    404: [ErrorCode.POST_NOT_FOUND],
    409: [ErrorCode.POST_NOT_ACTIVE],
    413: [ErrorCode.IMAGE_TOO_LARGE],
    502: [ErrorCode.UPLOAD_FAILED],
  })
  add(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<PostImageResponseDto[]> {
    return this.uploads.addImages(user, id, files);
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam(POST_ID)
  @ApiParam({
    name: 'imageId',
    description: 'Image id',
    example: 'cm2ximg0000abc',
  })
  @ApiOperation({ summary: 'Remove one image from my post' })
  @ApiNoContentResponse({ description: 'Removed' })
  @ApiErrors({
    401: [ErrorCode.UNAUTHORIZED],
    403: [ErrorCode.POST_NOT_OWNER, ErrorCode.USER_BLOCKED],
    404: [ErrorCode.IMAGE_NOT_FOUND],
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    return this.uploads.removeImage(user, id, imageId);
  }
}
