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

  findAll(userId: string, status: TaskFilter = 'ALL') {
    return this.prisma.client.task.findMany({
      where: {
        ownerId: userId,
        ...(status === 'ALL' ? {} : { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  countOverdue(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return this.prisma.client.task.count({
      where: {
        ownerId: userId,
        dueDate: { lt: startOfToday },
        status: { not: 'DONE' },
      },
    });
  }

  async create(userId: string, input: CreateTaskInput) {
    const task = await this.prisma.client.task.create({
      data: {
        title: input.title,
        description: input.description,
        ownerId: userId,
        assigneeId: userId,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
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

  private async getTaskOrFail(userId: string, id: string) {
    const task = await this.prisma.client.task.findFirst({
      where: { id, ownerId: userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async updateStatus(userId: string, id: string, status: TaskStatus) {
    await this.getTaskOrFail(userId, id);

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

  async update(userId: string, id: string, input: UpdateTaskInput) {
    await this.getTaskOrFail(userId, id);

    return this.prisma.client.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
      },
    });
  }

  async updateDueDate(userId: string, id: string, dueDate: string | null) {
    await this.getTaskOrFail(userId, id);

    return this.prisma.client.task.update({
      where: { id },
      data: { dueDate: dueDate ? new Date(dueDate) : null },
    });
  }

  async delete(userId: string, id: string) {
    const task = await this.getTaskOrFail(userId, id);

    await this.prisma.client.task.delete({ where: { id } });
    return task;
  }
}
