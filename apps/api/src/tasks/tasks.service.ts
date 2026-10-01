import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  type CreateTaskInput,
  type NotificationJob,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  findAll() {
    return this.prisma.client.task.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreateTaskInput) {
    const task = await this.prisma.client.task.create({
      data: {
        title: input.title,
        description: input.description,
      },
    });

    const job: NotificationJob = {
      taskId: task.id,
      type: 'task_assigned',
      message: `Task "${task.title}" was created`,
    };

    await this.notificationsQueue.add('task_assigned', job);

    return task;
  }
}
