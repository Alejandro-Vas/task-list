import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  type CreateTaskInput,
  type NotificationJob,
  type TaskFilter,
  type TaskStatus,
  type UpdateTaskInput,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  findAll(status: TaskFilter = 'ALL') {
    return this.prisma.client.task.findMany({
      where: status === 'ALL' ? undefined : { status },
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

  async updateStatus(id: string, status: TaskStatus) {
    const task = await this.prisma.client.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updated = await this.prisma.client.task.update({
      where: { id },
      data: { status },
    });

    if (status === 'DONE') {
      const job: NotificationJob = {
        taskId: updated.id,
        type: 'task_completed',
        message: `Task "${updated.title}" was completed`,
      };

      await this.notificationsQueue.add('task_completed', job);
    }

    return updated;
  }

  async update(id: string, input: UpdateTaskInput) {
    const task = await this.prisma.client.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.client.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
      },
    });
  }

  async delete(id: string) {
    const task = await this.prisma.client.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.client.task.delete({ where: { id } });
    return task;
  }
}
