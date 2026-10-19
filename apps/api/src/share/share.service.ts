import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { SharedTask } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

const TOKEN_BYTES = 32;
const DEFAULT_TTL_DAYS = 7;

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async createShareLink(userId: string, taskId: string) {
    const task = await this.prisma.client.task.findFirst({
      where: { id: taskId, ownerId: userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const rawToken = randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_TTL_DAYS);

    await this.prisma.client.shareToken.create({
      data: { tokenHash, taskId, userId, expiresAt },
    });

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  async revokeShareLink(userId: string, taskId: string) {
    const task = await this.prisma.client.task.findFirst({
      where: { id: taskId, ownerId: userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.client.shareToken.updateMany({
      where: { taskId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async resolveSharedTask(rawToken: string): Promise<SharedTask> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const share = await this.prisma.client.shareToken.findUnique({
      where: { tokenHash },
      include: {
        task: { select: { title: true, description: true, status: true, dueDate: true, createdAt: true, pendingDeletionAt: true } },
        user: { select: { name: true } },
      },
    });

    if (!share) {
      throw new NotFoundException('Share link not found');
    }

    if (share.revokedAt) {
      throw new ForbiddenException('Share link has been revoked');
    }

    if (share.expiresAt < new Date()) {
      throw new ForbiddenException('Share link has expired');
    }

    if (share.task.pendingDeletionAt) {
      throw new NotFoundException('Task not found');
    }

    return {
      title: share.task.title,
      description: share.task.description,
      status: share.task.status,
      dueDate: share.task.dueDate?.toISOString() ?? null,
      createdAt: share.task.createdAt.toISOString(),
      ownerName: share.user.name,
    };
  }
}
