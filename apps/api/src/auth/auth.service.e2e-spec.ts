import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const userId = 'user-1';

describe('should change the password for an authenticated user', () => {
  let service: AuthService;
  let storedPasswordHash: string;
  const userUpdate = vi.fn();
  const refreshTokenUpdateMany = vi.fn();

  beforeEach(async () => {
    storedPasswordHash = await hash('current-password', 10);

    userUpdate.mockImplementation(({ data }: { data: { passwordHash: string } }) => {
      storedPasswordHash = data.passwordHash;
      return Promise.resolve({});
    });
    refreshTokenUpdateMany.mockResolvedValue({ count: 1 });

    const prisma = {
      client: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: userId,
            email: 'demo@example.com',
            name: 'Demo',
            role: 'USER',
            passwordHash: storedPasswordHash,
          }),
          update: userUpdate,
        },
        refreshToken: { updateMany: refreshTokenUpdateMany },
      },
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      {} as unknown as JwtService,
    );
  });

  it('should update the password hash and revoke all refresh tokens', async () => {
    await service.changePassword(userId, {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });

    expect(await compare('new-password', storedPasswordHash)).toBe(true);
    expect(refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('should reject an invalid current password without changing anything', async () => {
    await expect(
      service.changePassword(userId, {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(userUpdate).not.toHaveBeenCalled();
    expect(refreshTokenUpdateMany).not.toHaveBeenCalled();
  });
});
