import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

const KEY_PREFIX = 'throttler';
const BLOCK_KEY_PREFIX = 'throttler:block';

/**
 * Atomic fixed-window counter:
 * - KEYS[1] — window counter, KEYS[2] — block marker
 * - ARGV[1..3] — ttl, limit, blockDuration (all in ms)
 * Returns [totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked].
 */
const INCREMENT_SCRIPT = `
local countKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  local blockedHits = tonumber(redis.call('GET', countKey) or '0')
  return { blockedHits, redis.call('PTTL', countKey), blockTtl, 1 }
end

local totalHits = redis.call('INCR', countKey)
if totalHits == 1 then
  redis.call('PEXPIRE', countKey, ttl)
end

local timeToExpire = redis.call('PTTL', countKey)

if totalHits > limit then
  local timeToBlockExpire = timeToExpire
  if blockDuration > 0 then
    redis.call('SET', blockKey, '1', 'PX', blockDuration)
    timeToBlockExpire = blockDuration
  end
  return { totalHits, timeToExpire, timeToBlockExpire, 1 }
end

return { totalHits, timeToExpire, 0, 0 }
`;

@Injectable()
export class RedisThrottlerStorage
  implements ThrottlerStorage, OnModuleDestroy
{
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    const [totalHits, timeToExpire, timeToBlockExpire, isBlocked] = (await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      `${KEY_PREFIX}:${key}`,
      `${BLOCK_KEY_PREFIX}:${key}`,
      ttl,
      limit,
      blockDuration,
    )) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: Math.ceil(timeToExpire / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
