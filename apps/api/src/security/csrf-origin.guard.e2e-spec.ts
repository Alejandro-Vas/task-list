import 'reflect-metadata';
import {
  Controller,
  Get,
  Post,
  type INestApplication,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CORS_ORIGINS } from './csrf.config';
import { CsrfOriginGuard } from './csrf-origin.guard';

const allowedOrigin = CORS_ORIGINS[0];
const disallowedOrigin = 'https://evil.example.com';

@Controller('csrf-test')
class CsrfTestController {
  @Post()
  create() {
    return { ok: true };
  }

  @Get()
  read() {
    return { ok: true };
  }
}

describe('should protect state-changing requests via Origin/Referer', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CsrfTestController],
      providers: [{ provide: APP_GUARD, useClass: CsrfOriginGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow a request from an allowed origin', async () => {
    await request(app.getHttpServer())
      .post('/csrf-test')
      .set('Origin', allowedOrigin)
      .expect(201);
  });

  it('should reject a request from a disallowed origin', async () => {
    await request(app.getHttpServer())
      .post('/csrf-test')
      .set('Origin', disallowedOrigin)
      .expect(403);
  });

  it('should allow a request with an allowed referer', async () => {
    await request(app.getHttpServer())
      .post('/csrf-test')
      .set('Referer', `${allowedOrigin}/tasks`)
      .expect(201);
  });

  it('should reject a request with a disallowed referer', async () => {
    await request(app.getHttpServer())
      .post('/csrf-test')
      .set('Referer', `${disallowedOrigin}/tasks`)
      .expect(403);
  });

  it('should allow non-browser requests without origin and referer', async () => {
    await request(app.getHttpServer()).post('/csrf-test').expect(201);
  });

  it('should skip safe methods even with a disallowed origin', async () => {
    await request(app.getHttpServer())
      .get('/csrf-test')
      .set('Origin', disallowedOrigin)
      .expect(200);
  });
});
