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

const TEST_SECRET = 'test-export-secret';
const BOM = '\uFEFF';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate: Date | null;
  createdAt: Date;
};

const ROWS: TaskRow[] = [
  {
    id: 't-1',
    title: 'Plain title',
    description: null,
    status: 'TODO',
    dueDate: null,
    createdAt: new Date('2026-02-01T09:00:00.000Z'),
  },
  {
    id: 't-2',
    title: 'Buy milk, bread, and "coffee"',
    description: 'line one\nline two',
    status: 'DONE',
    dueDate: new Date('2026-02-10T00:00:00.000Z'),
    createdAt: new Date('2026-02-02T09:00:00.000Z'),
  },
];

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
      findMany: vi.fn().mockResolvedValue(ROWS),
    },
  },
};

const mockQueue = { add: vi.fn() };

describe('should export the tasks of the owner as a CSV file', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: TEST_SECRET, signOptions: { expiresIn: '15m' } }),
      ],
      controllers: [TasksController],
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS), useValue: mockQueue },
        { provide: getQueueToken(QUEUE_NAMES.TASK_DELETION), useValue: mockQueue },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
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

  const body = async (): Promise<string> => {
    const response = await request(app.getHttpServer())
      .get('/tasks/export/csv')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return response.text.replace(BOM, '');
  };

  it('should ask for every task of the owner without a status filter', async () => {
    await body();

    expect(mockPrismaService.client.task.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'u-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should respond with a CSV attachment and a dated filename', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks/export/csv')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="tasks-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
  });

  it('should write the header row and one record per task', async () => {
    const records = await body();

    expect(records.startsWith('id,title,description,status,dueDate,createdAt')).toBe(
      true,
    );
    expect(records).toContain(
      't-1,Plain title,,TODO,,2026-02-01T09:00:00.000Z',
    );
  });

  it('should quote commas and double the quotes inside a title', async () => {
    const records = await body();

    expect(records).toContain(
      't-2,"Buy milk, bread, and ""coffee""","line one\nline two",DONE,2026-02-10T00:00:00.000Z,2026-02-02T09:00:00.000Z',
    );
  });

  it('should reject an export without an access token', async () => {
    await request(app.getHttpServer()).get('/tasks/export/csv').expect(401);
  });
});
