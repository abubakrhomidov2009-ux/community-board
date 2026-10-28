import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperAdminBootstrap } from './super-admin.bootstrap';

@Module({
  controllers: [AdminController],
  providers: [AdminService, SuperAdminBootstrap],
})
export class AdminModule {}
