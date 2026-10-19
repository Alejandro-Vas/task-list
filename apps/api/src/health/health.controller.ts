import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Health } from '../swagger/api-schemas';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisThrottlerStorage } from '../throttler/redis-throttler.storage';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly throttlerStorage: RedisThrottlerStorage,
  ) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: Health })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOkResponse({ description: 'Database and Redis are reachable' })
  async ready() {
    const checks = { database: false, redis: false };

    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      checks.redis = await this.throttlerStorage.ping();
    } catch {
      checks.redis = false;
    }

    if (!checks.database || !checks.redis) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return { status: 'ok', checks, timestamp: new Date().toISOString() };
  }
}
