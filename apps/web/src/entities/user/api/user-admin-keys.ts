import type { AdminUsersQuery } from '@repo/shared';

export type AdminUsersListKey = Pick<
  AdminUsersQuery,
  'page' | 'perPage' | 'search' | 'role'
>;

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (params: AdminUsersListKey) =>
    [...adminKeys.users(), 'list', params] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  logs: (page: number) => [...adminKeys.all, 'logs', page] as const,
};
