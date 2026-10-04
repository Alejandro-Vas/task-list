import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { ACCESS_TOKEN_TTL, AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-only-insecure-secret',
        signOptions: {
          expiresIn:
            (process.env.JWT_ACCESS_TTL ??
              ACCESS_TOKEN_TTL) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
