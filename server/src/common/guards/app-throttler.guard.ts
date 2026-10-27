import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * The rate-limit guard for the whole app.
 * THROTTLE_DISABLED=true switches every limit off (global and per route). Only for automated tests.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(): Promise<boolean> {
    return Promise.resolve(process.env.THROTTLE_DISABLED === 'true');
  }
}
