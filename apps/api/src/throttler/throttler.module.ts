import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import {
  THROTTLE_GLOBAL_LIMIT,
  THROTTLE_GLOBAL_TTL,
} from './throttler.config';

@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
class RedisThrottlerStorageModule {}

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisThrottlerStorageModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [
          { ttl: THROTTLE_GLOBAL_TTL, limit: THROTTLE_GLOBAL_LIMIT },
        ],
        storage,
      }),
    }),
  ],
  exports: [ThrottlerModule],
})
export class AppThrottlerModule {}
