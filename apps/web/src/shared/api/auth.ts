import type {
  AuthResponse,
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from '@repo/shared';
import { authedFetch, readJson, readVoid } from './client';

export function register(input: RegisterInput): Promise<AuthResponse> {
  return authedFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
    skipAuthRefresh: true,
  }).then((response) => readJson<AuthResponse>(response));
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return authedFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    skipAuthRefresh: true,
  }).then((response) => readJson<AuthResponse>(response));
}

export function getMe(): Promise<AuthUser> {
  return authedFetch('/api/auth/me').then((response) =>
    readJson<AuthUser>(response),
  );
}

export async function logout(): Promise<void> {
  await authedFetch('/api/auth/logout', {
    method: 'POST',
    skipAuthRefresh: true,
  });
}

export function changePassword(input: ChangePasswordInput): Promise<void> {
  return authedFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((response) => readVoid(response));
}
