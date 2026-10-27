import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { TasksService } from './tasks.service';

@Module({
  imports: [PostsModule],
  providers: [TasksService],
})
export class TasksModule {}
