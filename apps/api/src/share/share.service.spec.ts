import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShareService } from './share.service';

const RAW_TOKEN = 'share-token-value';

function createService(overrides: { isBlocked?: boolean; revokedAt?: Date | null } = {}) {
  const { isBlocked = false, revokedAt = null } = overrides;

  const shareToken = {
    findUnique: vi.fn().mockResolvedValue({
      revokedAt,
      expiresAt: new Date(Date.now() + 60_000),
      task: {
        title: 'Shared task',
        description: null,
        status: 'TODO',
        dueDate: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        pendingDeletionAt: null,
      },
      user: { name: 'Owner', isBlocked },
    }),
  };

  const prisma = { client: { shareToken } } as unknown as PrismaService;

  return new ShareService(prisma);
}

describe('should resolve a share link only for an active owner', () => {
  it('should return the task for an active owner', async () => {
    const service = createService();

    await expect(service.resolveSharedTask(RAW_TOKEN)).resolves.toEqual({
      title: 'Shared task',
      description: null,
      status: 'TODO',
      dueDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      ownerName: 'Owner',
    });
  });

  it('should refuse a link whose owner is blocked', async () => {
    const service = createService({ isBlocked: true });

    await expect(service.resolveSharedTask(RAW_TOKEN)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should refuse a revoked link', async () => {
    const service = createService({ revokedAt: new Date() });

    await expect(service.resolveSharedTask(RAW_TOKEN)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
