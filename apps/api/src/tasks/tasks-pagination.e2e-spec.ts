import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { QUEUE_NAMES } from '@repo/shared';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

const TEST_SECRET = 'test-pagination-secret';
const OWNER_ID = 'u-1';
const TOTAL_TASKS = 47;

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeId: string | null;
  ownerId: string;
  projectId: string | null;
  dueDate: Date | null;
  pendingDeletionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const ALL_TASKS: TaskRow[] = Array.from({ length: TOTAL_TASKS }, (_, i) => ({
  id: `t-${i}`,
  title: `task-${i}`,
  description: null,
  status: 'TODO' as const,
  assigneeId: null,
  ownerId: OWNER_ID,
  projectId: null,
  dueDate: null,
  pendingDeletionAt: null,
  createdAt: new Date(Date.now() + i * 1000),
  updatedAt: new Date(),
}));

const mockPrismaService = {
  client: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: OWNER_ID,
        email: 'user@example.com',
        role: 'USER',
        isBlocked: false,
      }),
    },
    task: {
      count: vi.fn().mockImplementation(({ where }) => {
        const filtered = ALL_TASKS.filter(
          (t) => t.ownerId === where.ownerId,
        );
        return Promise.resolve(filtered.length);
      }),
      findMany: vi.fn().mockImplementation((args) => {
        const { skip = 0, take = 20, where } = args;
        const filtered = ALL_TASKS.filter(
          (t) => t.ownerId === where.ownerId,
        );
        filtered.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        return Promise.resolve(filtered.slice(skip, skip + take));
      }),
    },
  },
};

describe('GET /tasks pagination', () => {
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
        { provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS), useValue: {} },
        { provide: getQueueToken(QUEUE_NAMES.TASK_DELETION), useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    token = await moduleRef
      .get(JwtService)
      .signAsync({ sub: OWNER_ID, email: 'user@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return default page 1 with 20 items', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      page: 1,
      perPage: 20,
      total: TOTAL_TASKS,
    });
    expect(response.body.items).toHaveLength(20);
  });

  it('should return page 2 with remaining items', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks?page=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({ page: 2, perPage: 20 });
    expect(response.body.items).toHaveLength(20);
  });

  it('should return the last partial page', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks?page=3')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({ page: 3, perPage: 20 });
    expect(response.body.items).toHaveLength(7);
  });

  it('should return a custom perPage', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks?perPage=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({ page: 1, perPage: 10, total: TOTAL_TASKS });
    expect(response.body.items).toHaveLength(10);
  });

  it('should return 400 when page is 0', async () => {
    await request(app.getHttpServer())
      .get('/tasks?page=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should return 400 when perPage is 0', async () => {
    await request(app.getHttpServer())
      .get('/tasks?perPage=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should return 400 when perPage exceeds maximum (101)', async () => {
    await request(app.getHttpServer())
      .get('/tasks?perPage=101')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should return 400 when page is not a number', async () => {
    await request(app.getHttpServer())
      .get('/tasks?page=abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should return 400 when perPage is not a number', async () => {
    await request(app.getHttpServer())
      .get('/tasks?perPage=abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should not duplicate or lose tasks between consecutive pages', async () => {
    const page1 = await request(app.getHttpServer())
      .get('/tasks?page=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const page2 = await request(app.getHttpServer())
      .get('/tasks?page=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = new Set<string>();

    for (const task of page1.body.items) {
      expect(ids.has(task.id)).toBe(false);
      ids.add(task.id);
    }

    for (const task of page2.body.items) {
      expect(ids.has(task.id)).toBe(false);
      ids.add(task.id);
    }

    expect(ids.size).toBe(40);
  });

  it('should return 401 without token', async () => {
    await request(app.getHttpServer()).get('/tasks').expect(401);
  });
});
