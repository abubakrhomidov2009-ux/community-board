import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Locale } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import { buildVerificationEmail } from './mail-templates';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const SEND_TIMEOUT_MS = 15_000;

export interface VerificationEmailInput {
  to: string;
  username: string;
  locale: Locale;
  link: string;
}

/**
 * The only place that sends email. It uses Brevo's HTTP API (no extra package),
 * so the provider can be swapped by changing only this file.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const fromEmail = this.config.get<string>('MAIL_FROM_EMAIL');
    const fromName =
      this.config.get<string>('MAIL_FROM_NAME') ?? 'Community Board';
    if (!apiKey || !fromEmail) {
      this.logger.error(
        'BREVO_API_KEY or MAIL_FROM_EMAIL is missing in server/.env',
      );
      throw new AppException(
        ErrorCode.MAIL_SEND_FAILED,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const email = buildVerificationEmail(
      input.locale,
      input.username,
      input.link,
    );
    try {
      const response = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: input.to }],
          subject: email.subject,
          htmlContent: email.html,
          textContent: email.text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!response.ok) {
        // Brevo explains the problem in the body (wrong key, sender not verified, IP not allowed...).
        const body = await response.text().catch(() => '');
        this.logger.error(
          `Brevo answered ${response.status}: ${body.slice(0, 300)}`,
        );
        throw new AppException(
          ErrorCode.MAIL_SEND_FAILED,
          HttpStatus.BAD_GATEWAY,
        );
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      this.logger.error(`Could not reach Brevo: ${String(error)}`);
      throw new AppException(
        ErrorCode.MAIL_SEND_FAILED,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
