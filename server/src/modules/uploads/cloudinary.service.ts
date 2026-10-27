import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadedImage {
  url: string;
  publicId: string;
}

/** The only place that talks to Cloudinary, so the provider could be swapped later. */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    this.configured = Boolean(cloudName && apiKey && apiSecret);
    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    } else {
      this.logger.warn(
        'Cloudinary keys are missing in server/.env: photo uploads will fail with UPLOAD_FAILED',
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /** Uploads one image. The picture is limited to 1600px so pages stay light on slow phones. */
  upload(buffer: Buffer): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
      if (!this.configured) {
        reject(new Error('Cloudinary is not configured'));
        return;
      }
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'community-board/posts',
          resource_type: 'image',
          transformation: [
            { width: 1600, height: 1600, crop: 'limit', quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new Error('Cloudinary returned no result'),
            );
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  /** Deletes images. Never throws: a failed cleanup must not block deleting a post. */
  async destroyMany(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0 || !this.configured) return;
    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
      this.logger.error(
        `Could not delete ${publicIds.length} image(s) from Cloudinary: ${String(error)}`,
      );
    }
  }
}
