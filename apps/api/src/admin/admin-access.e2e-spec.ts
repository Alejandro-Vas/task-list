import 'reflect-metadata';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const TEST_SECRET = 'test-admin-secret';

type ProbeUser = {
  id: string;
  email: string;
  role: string;
  isBlocked: boolean;
};

const usersById = new Map<string, ProbeUser>([
  ['u-owner', { id: 'u-owner', email: 'o@e.com', role: 'OWNER', isBlocked: false }],
  ['u-admin', { id: 'u-admin', email: 'a@e.com', role: 'ADMIN', isBlocked: false }],
  ['u-basic', { id: 'u-basic', email: 'b@e.com', role: 'USER', isBlocked: false }],
  [
    'u-frozen',
    { id: 'u-frozen', email: 'f@e.com', role: 'ADMIN', isBlocked: true },
  ],
]);

@Controller('admin-probe')
class AdminProbeController {
  @Roles('ADMIN', 'OWNER')
  @Get('users')
  users() {
    return { ok: true };
  }
}

describe('should let only unblocked admins through the admin routes', () => {
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
      controllers: [AdminProbeController],
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

  it('should reject a request without a token', async () => {
    await request(app.getHttpServer()).get('/admin-probe/users').expect(401);
  });

  it('should forbid a plain USER', async () => {
    await request(app.getHttpServer())
      .get('/admin-probe/users')
      .set('Authorization', `Bearer ${await tokenFor('u-basic')}`)
      .expect(403);
  });

  it('should allow an ADMIN', async () => {
    await request(app.getHttpServer())
      .get('/admin-probe/users')
      .set('Authorization', `Bearer ${await tokenFor('u-admin')}`)
      .expect(200);
  });

  it('should allow an OWNER', async () => {
    await request(app.getHttpServer())
      .get('/admin-probe/users')
      .set('Authorization', `Bearer ${await tokenFor('u-owner')}`)
      .expect(200);
  });

  it('should reject a blocked admin with 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin-probe/users')
      .set('Authorization', `Bearer ${await tokenFor('u-frozen')}`)
      .expect(401);

    expect(response.body.message).toBe('User is blocked');
  });
});
