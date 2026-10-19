import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  UNDO_DELETE_WINDOW_MS,
  type CreateTaskInput,
  type NotificationJob,
  type TaskDeletionJob,
  type TaskFilter,
  type TaskStatus,
  type UpdateTaskInput,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toCsv } from './csv';

const CSV_HEADERS = [
  'id',
  'title',
  'description',
  'status',
  'dueDate',
  'createdAt',
] as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TASK_DELETION)
    private readonly deletionQueue: Queue,
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

  /** Every task of the user, serialized as CSV. Status filters are ignored on purpose. */
  async exportCsv(userId: string): Promise<string> {
    const tasks = await this.findAll(userId);

    return toCsv(
      CSV_HEADERS,
      tasks.map((task) => [
        task.id,
        task.title,
        task.description,
        task.status,
        task.dueDate,
        task.createdAt,
      ]),
    );
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

  /**
   * Does not remove the row. It stamps `pendingDeletionAt` and schedules a
   * delayed job, which gives the client `UNDO_DELETE_WINDOW_MS` to call
   * `undoDelete`. The job carries the same stamp, so the worker deletes only
   * while the stamp still matches (see apps/worker).
   */
  async delete(userId: string, id: string) {
    const task = await this.getTaskOrFail(userId, id);

    const scheduledFor = new Date(Date.now() + UNDO_DELETE_WINDOW_MS);

    const updated = await this.prisma.client.task.update({
      where: { id },
      data: { pendingDeletionAt: scheduledFor },
    });

    const job: TaskDeletionJob = {
      taskId: task.id,
      scheduledFor: scheduledFor.toISOString(),
    };

    // jobId = taskId lets `undoDelete` find this exact job and drop it.
    await this.deletionQueue.add('hard-delete', job, {
      jobId: task.id,
      delay: UNDO_DELETE_WINDOW_MS,
      removeOnComplete: true,
      removeOnFail: false,
    });

    return updated;
  }

  /**
   * The DB stamp is the source of truth: clearing it is what actually cancels
   * the deletion, and removing the job is only an optimisation. If the worker
   * already dropped the row, `getTaskOrFail` above answers 404 — the window is
   * over and there is nothing to restore.
   */
  async undoDelete(userId: string, id: string) {
    const task = await this.getTaskOrFail(userId, id);

    if (task.pendingDeletionAt === null) {
      throw new ConflictException('Task is not scheduled for deletion');
    }

    const updated = await this.prisma.client.task.update({
      where: { id },
      data: { pendingDeletionAt: null },
    });

    await this.removeDeletionJob(id);

    return updated;
  }

  private async removeDeletionJob(taskId: string) {
    const job = await this.deletionQueue.getJob(taskId);

    if (job) {
      await job.remove();
    }
  }
}
