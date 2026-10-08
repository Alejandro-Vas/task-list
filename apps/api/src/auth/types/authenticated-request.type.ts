import type { Request } from 'express';
import type { UserRole } from '@repo/shared';

export type AuthUser = {
  userId: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & { user?: AuthUser };
