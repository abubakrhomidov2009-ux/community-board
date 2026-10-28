import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureSuperAdmin } from './super-admin';

/** On every start: if SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are set, that account is the super admin. */
@Injectable()
export class SuperAdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrap.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL');
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD');
    if (!email || !password) return;
    try {
      const result = await ensureSuperAdmin(this.prisma, {
        email,
        password,
        resetPassword: false,
      });
      if (result !== 'unchanged') {
        this.logger.log(`Super admin account ${result}`);
      }
    } catch (error) {
      this.logger.error(`Could not set up the super admin: ${String(error)}`);
    }
  }
}
