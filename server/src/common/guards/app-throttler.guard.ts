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

  /**
   * Count requests per real visitor. Behind Vercel and Render the socket address is a proxy, so the first
   * address of X-Forwarded-For (set by Vercel) is the visitor. Locally there is no header: use req.ip.
   */
  protected getTracker(req: Record<string, any>): Promise<string> {
    const request = req as {
      headers?: Record<string, string | string[] | undefined>;
      ip?: string;
    };
    const header = request.headers?.['x-forwarded-for'];
    const raw = Array.isArray(header) ? header[0] : header;
    const first = typeof raw === 'string' ? raw.split(',')[0]?.trim() : '';
    return Promise.resolve(first || request.ip || 'unknown');
  }
}
