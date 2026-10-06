import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { AppThrottlerModule } from '../throttler/throttler.module';
import { RedisThrottlerStorage } from '../throttler/redis-throttler.storage';
import { THROTTLE_AUTH_LIMIT } from '../throttler/throttler.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const loginBody = { email: 'demo@example.com', password: 'demo1234' };

describe('should rate limit the auth endpoints', () => {
  let app: INestApplication;

  const mockAuthService = {
    login: vi.fn().mockResolvedValue({
      user: { id: 'user-1', email: loginBody.email, name: 'Demo' },
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppThrottlerModule],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    })
      .overrideProvider(RedisThrottlerStorage)
      .useValue(new ThrottlerStorageService())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow requests up to the limit and then respond with 429', async () => {
    for (let attempt = 0; attempt < THROTTLE_AUTH_LIMIT; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginBody)
        .expect(200);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginBody)
      .expect(429);
  });
});
