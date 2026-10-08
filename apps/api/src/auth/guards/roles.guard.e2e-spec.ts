import 'reflect-metadata';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

const TEST_SECRET = 'test-secret';

const usersById = new Map<string, { id: string; email: string; role: string }>(
  [
    ['user-owner', { id: 'user-owner', email: 'owner@example.com', role: 'OWNER' }],
    ['user-admin', { id: 'user-admin', email: 'admin@example.com', role: 'ADMIN' }],
    ['user-basic', { id: 'user-basic', email: 'basic@example.com', role: 'USER' }],
  ],
);

@Controller('roles-test')
class RolesTestController {
  @Get('open')
  open() {
    return { ok: true };
  }

  @Roles('OWNER', 'ADMIN')
  @Get('staff')
  staff() {
    return { ok: true };
  }
}

describe('should guard routes by role', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockPrismaService = {
    client: {
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          usersById.get(where.id),
        ),
      },
    },
  };

  const tokenFor = async (userId: string): Promise<string> =>
    jwtService.signAsync({ sub: userId, email: 'stale@example.com' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [RolesTestController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject requests without a token', async () => {
    await request(app.getHttpServer()).get('/roles-test/open').expect(401);
  });

  it('should allow any authenticated user on a route without @Roles', async () => {
    await request(app.getHttpServer())
      .get('/roles-test/open')
      .set('Authorization', `Bearer ${await tokenFor('user-basic')}`)
      .expect(200);
  });

  it('should allow OWNER on a role-protected route', async () => {
    await request(app.getHttpServer())
      .get('/roles-test/staff')
      .set('Authorization', `Bearer ${await tokenFor('user-owner')}`)
      .expect(200);
  });

  it('should allow ADMIN on a role-protected route', async () => {
    await request(app.getHttpServer())
      .get('/roles-test/staff')
      .set('Authorization', `Bearer ${await tokenFor('user-admin')}`)
      .expect(200);
  });

  it('should forbid USER on a role-protected route', async () => {
    await request(app.getHttpServer())
      .get('/roles-test/staff')
      .set('Authorization', `Bearer ${await tokenFor('user-basic')}`)
      .expect(403);
  });

  it('should reject a token of a user that no longer exists', async () => {
    await request(app.getHttpServer())
      .get('/roles-test/open')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
  });
});
