import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisThrottlerStorage } from '../throttler/redis-throttler.storage';
import { HealthController } from './health.controller';

function createController(options: { database?: boolean; redis?: boolean } = {}) {
  const { database = true, redis = true } = options;

  const prisma = {
    client: {
      $queryRaw: database
        ? vi.fn().mockResolvedValue([{ '?column?': 1 }])
        : vi.fn().mockRejectedValue(new Error('connection refused')),
    },
  };

  const storage = {
    ping: redis
      ? vi.fn().mockResolvedValue(true)
      : vi.fn().mockRejectedValue(new Error('connection refused')),
  };

  return new HealthController(
    prisma as unknown as PrismaService,
    storage as unknown as RedisThrottlerStorage,
  );
}

describe('should report liveness and readiness separately', () => {
  it('should keep the liveness answer static', () => {
    expect(createController().check()).toMatchObject({ status: 'ok' });
  });

  it('should confirm reachable dependencies', async () => {
    await expect(createController().ready()).resolves.toMatchObject({
      status: 'ok',
      checks: { database: true, redis: true },
    });
  });

  it('should fail readiness when the database is unreachable', async () => {
    await expect(
      createController({ database: false }).ready(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('should fail readiness when Redis is unreachable', async () => {
    await expect(
      createController({ redis: false }).ready(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
