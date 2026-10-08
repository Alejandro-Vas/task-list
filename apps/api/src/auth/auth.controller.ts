import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { loginSchema, registerSchema } from '@repo/shared';
import type { CookieOptions, Request, Response } from 'express';
import {
  AuthResponse,
  AuthUser as AuthUserSchema,
  LoginBody,
  RefreshResponse,
  RegisterBody,
} from '../swagger/api-schemas';
import {
  THROTTLE_AUTH_LIMIT,
  THROTTLE_AUTH_TTL,
} from '../throttler/throttler.config';
import { REFRESH_TTL_DAYS, AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { AuthUser } from './types/authenticated-request.type';

const REFRESH_COOKIE = 'refresh_token';

const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: (process.env.COOKIE_SAME_SITE ?? 'lax') as CookieOptions['sameSite'],
  path: '/api/auth',
  maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL } })
  @Post('register')
  @ApiCreatedResponse({ type: AuthResponse })
  async register(
    @Body() body: RegisterBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('Invalid registration data');
    }

    const { user, tokens } = await this.authService.register(parsed.data);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL } })
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponse })
  async login(
    @Body() body: LoginBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('Invalid login data');
    }

    const { user, tokens } = await this.authService.login(parsed.data);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: RefreshResponse })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens } = await this.authService.refresh(
      req.cookies?.[REFRESH_COOKIE],
    );

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
  }

  @Post('logout-all')
  @HttpCode(204)
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({ description: 'Missing or expired access token' })
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.userId);
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
  }

  @Get('me')
  @ApiOkResponse({ type: AuthUserSchema })
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({ description: 'Missing or expired access token' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId);
  }
}
