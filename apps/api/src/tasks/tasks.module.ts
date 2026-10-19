import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@repo/shared';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
    BullModule.registerQueue({ name: QUEUE_NAMES.TASK_DELETION }),
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
