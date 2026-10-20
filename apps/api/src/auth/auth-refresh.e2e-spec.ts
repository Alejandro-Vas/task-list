import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const RAW_TOKEN = 'refresh-token-value';
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');

function createContext(options: { consumeCount?: number; blocked?: boolean } = {}) {
  const { consumeCount = 1, blocked = false } = options;

  const refreshToken = {
    findUnique: vi.fn().mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: TOKEN_HASH,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    }),
    updateMany: vi.fn().mockResolvedValue({ count: consumeCount }),
    create: vi.fn().mockResolvedValue({ id: 'token-2' }),
  };

  const user = {
    findUnique: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo',
      role: 'USER',
      isBlocked: blocked,
    }),
  };

  const client = { refreshToken, user };
  const prisma = {
    client: {
      ...client,
      $transaction: vi.fn(
        (callback: (tx: typeof client) => Promise<unknown>) => callback(client),
      ),
    },
  };

  const jwtService = {
    signAsync: vi.fn().mockResolvedValue('access-token'),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwtService as unknown as JwtService,
  );

  return { service, refreshToken, user, prisma };
}

describe('should rotate a refresh token exactly once', () => {
  it('should consume the old token and create a successor in one transaction', async () => {
    const { service, refreshToken, prisma } = createContext();

    const result = await service.refresh(RAW_TOKEN);

    expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
    expect(refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'token-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
      }),
    });
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.tokens.refreshToken).not.toBe(RAW_TOKEN);
  });

  it('should reject the token when a concurrent request already consumed it', async () => {
    const { service, refreshToken } = createContext({ consumeCount: 0 });

    await expect(service.refresh(RAW_TOKEN)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('should reject a blocked user without creating a new token', async () => {
    const { service, refreshToken } = createContext({ blocked: true });

    await expect(service.refresh(RAW_TOKEN)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('should reject a missing refresh token', async () => {
    const { service } = createContext();

    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
