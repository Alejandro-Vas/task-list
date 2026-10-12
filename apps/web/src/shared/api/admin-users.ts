import type {
  AdminStats,
  AdminUser,
  AdminUsersQuery,
  PaginatedAdminLogs,
  PaginatedAdminUsers,
  UpdateAdminUserInput,
  UserRole,
} from '@repo/shared';
import { authedFetch, readJson, readVoid } from './client';

type UsersPageParams = Pick<
  AdminUsersQuery,
  'page' | 'perPage' | 'search' | 'role'
>;

function buildUsersQuery(params: UsersPageParams): string {
  const search = new URLSearchParams({
    page: String(params.page),
    perPage: String(params.perPage),
  });

  if (params.search) {
    search.set('search', params.search);
  }

  if (params.role) {
    search.set('role', params.role);
  }

  return search.toString();
}

export function fetchAdminUsers(
  params: UsersPageParams,
): Promise<PaginatedAdminUsers> {
  return authedFetch(`/api/admin/users?${buildUsersQuery(params)}`).then(
    (response) => readJson<PaginatedAdminUsers>(response),
  );
}

export function fetchAdminStats(): Promise<AdminStats> {
  return authedFetch('/api/admin/users/stats').then((response) =>
    readJson<AdminStats>(response),
  );
}

export function fetchAdminLogs(
  page: number,
  perPage: number,
): Promise<PaginatedAdminLogs> {
  return authedFetch(`/api/admin/logs?page=${page}&perPage=${perPage}`).then(
    (response) => readJson<PaginatedAdminLogs>(response),
  );
}

export function updateUserRole(
  id: string,
  role: UserRole,
): Promise<AdminUser> {
  return authedFetch(`/api/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }).then((response) => readJson<AdminUser>(response));
}

export function updateAdminUser(
  id: string,
  input: UpdateAdminUserInput,
): Promise<AdminUser> {
  return authedFetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((response) => readJson<AdminUser>(response));
}

export function blockAdminUser(id: string): Promise<AdminUser> {
  return authedFetch(`/api/admin/users/${id}/block`, { method: 'POST' }).then(
    (response) => readJson<AdminUser>(response),
  );
}

export function unblockAdminUser(id: string): Promise<AdminUser> {
  return authedFetch(`/api/admin/users/${id}/block`, { method: 'DELETE' }).then(
    (response) => readJson<AdminUser>(response),
  );
}

export function revokeAdminUserSessions(id: string): Promise<void> {
  return authedFetch(`/api/admin/users/${id}/revoke-sessions`, {
    method: 'POST',
  }).then((response) => readVoid(response));
}

export function deleteAdminUser(id: string): Promise<AdminUser> {
  return authedFetch(`/api/admin/users/${id}`, { method: 'DELETE' }).then(
    (response) => readJson<AdminUser>(response),
  );
}
