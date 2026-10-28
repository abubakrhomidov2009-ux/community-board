import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PostsModule } from '../posts/posts.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PostsModule, MailModule, UploadsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
