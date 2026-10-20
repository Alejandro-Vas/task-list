import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { QUEUE_NAMES } from '@repo/shared';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodExceptionFilter } from '../common/zod-exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

const TEST_SECRET = 'test-validation-secret';

const mockPrismaService = {
  client: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'u-1',
        email: 'user@example.com',
        role: 'USER',
        isBlocked: false,
      }),
    },
    task: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
};

const mockQueue = { add: vi.fn() };

describe('should answer 400 when a request body breaks the schema', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [TasksController],
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS), useValue: mockQueue },
        { provide: getQueueToken(QUEUE_NAMES.TASK_DELETION), useValue: mockQueue },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: ZodExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    token = await moduleRef
      .get(JwtService)
      .signAsync({ sub: 'u-1', email: 'user@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject an empty title with a field error', async () => {
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      errors: [{ path: 'title' }],
    });
    expect(mockPrismaService.client.task.create).not.toHaveBeenCalled();
  });

  it('should reject an unknown status', async () => {
    mockPrismaService.client.task.findFirst.mockResolvedValue({
      id: 't-1',
      ownerId: 'u-1',
    });

    const response = await request(app.getHttpServer())
      .patch('/tasks/t-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'NOPE' })
      .expect(400);

    expect(response.body.errors[0].path).toBe('status');
  });
});
