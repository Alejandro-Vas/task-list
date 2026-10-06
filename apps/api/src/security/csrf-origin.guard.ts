import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { CORS_ORIGINS } from './csrf.config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const origin = request.headers.origin;

    if (origin) {
      if (this.isAllowed(request, origin)) {
        return true;
      }

      throw new ForbiddenException('Request origin is not allowed');
    }

    const referer = request.headers.referer;

    if (referer) {
      if (this.isAllowed(request, referer)) {
        return true;
      }

      throw new ForbiddenException('Request referer is not allowed');
    }

    // Non-browser clients (curl, mobile, server-to-server) do not send
    // Origin/Referer and are not exposed to CSRF, so let them through.
    return true;
  }

  private isAllowed(request: Request, originOrReferer: string): boolean {
    try {
      const url = new URL(originOrReferer);

      if (CORS_ORIGINS.includes(url.origin)) {
        return true;
      }

      // Same-origin requests (e.g. Swagger UI served by the API itself).
      return url.host === request.headers.host;
    } catch {
      return false;
    }
  }
}
