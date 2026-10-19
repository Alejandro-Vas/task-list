import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@repo/db';
import { compare, hash } from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import type {
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UserRole,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TTL_DAYS = 7;

const PASSWORD_SALT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 48;

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.prisma.client.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hash(input.password, PASSWORD_SALT_ROUNDS),
      },
    });

    return {
      user: this.toAuthUser(user),
      tokens: await this.issueTokens(user),
    };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked');
    }

    return {
      user: this.toAuthUser(user),
      tokens: await this.issueTokens(user),
    };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);

    return this.rotateRefreshToken(tokenHash);
  }

  /**
   * Consuming the old token and issuing the successor happen in one serializable
   * transaction: two concurrent requests cannot both rotate the same token, and
   * `logoutAll` either wins (the refresh sees a revoked row) or loses (the new
   * token is revoked by it).
   */
  private async rotateRefreshToken(
    tokenHash: string,
    attempt = 1,
  ): Promise<{ tokens: AuthTokens }> {
    try {
      return await this.prisma.client.$transaction(
        async (tx) => {
          const stored = await tx.refreshToken.findUnique({
            where: { tokenHash },
          });

          if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid refresh token');
          }

          const consumed = await tx.refreshToken.updateMany({
            where: { id: stored.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });

          if (consumed.count !== 1) {
            throw new UnauthorizedException('Invalid refresh token');
          }

          const user = await tx.user.findUnique({
            where: { id: stored.userId },
          });

          if (!user || user.isBlocked) {
            throw new UnauthorizedException('Invalid refresh token');
          }

          return { tokens: await this.issueTokens(user, tx) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        attempt < 3 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        return this.rotateRefreshToken(tokenHash, attempt + 1);
      }

      throw error;
    }
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!(await compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hash(input.newPassword, PASSWORD_SALT_ROUNDS),
      },
    });

    await this.logoutAll(userId);
  }

  async logoutAll(userId: string) {
    await this.prisma.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toAuthUser(user);
  }

  private async issueTokens(
    user: {
      id: string;
      email: string;
      role: UserRole;
    },
    client: Pick<Prisma.TransactionClient, 'refreshToken'> = this.prisma.client,
  ): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await client.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
