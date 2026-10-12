'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type {
  AdminUser,
  PaginatedAdminUsers,
  UpdateAdminUserInput,
  UserRole,
} from '@repo/shared';
import {
  blockAdminUser,
  deleteAdminUser,
  revokeAdminUserSessions,
  unblockAdminUser,
  updateAdminUser,
  updateUserRole,
} from '@/shared/api/admin-users';
import { adminKeys } from './user-admin-keys';

function patchAllLists(
  client: QueryClient,
  patch: (items: AdminUser[]) => AdminUser[],
): void {
  client.setQueriesData<PaginatedAdminUsers>(
    { queryKey: adminKeys.users() },
    (page) => (page ? { ...page, items: patch(page.items) } : page),
  );
}

// Stats counters and the audit trail change with every admin action.
function invalidateAdmin(client: QueryClient): void {
  client.invalidateQueries({ queryKey: adminKeys.all });
}

function applyUpdated(client: QueryClient, updated: AdminUser): void {
  patchAllLists(client, (items) =>
    items.map((item) => (item.id === updated.id ? updated : item)),
  );
  invalidateAdmin(client);
}

export function useUpdateUserRole() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      updateUserRole(id, role),
    onSuccess: (updated) => applyUpdated(client, updated),
  });
}

export function useUpdateAdminUser() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminUserInput }) =>
      updateAdminUser(id, input),
    onSuccess: (updated) => applyUpdated(client, updated),
  });
}

export function useBlockAdminUser() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => blockAdminUser(id),
    onSuccess: (updated) => applyUpdated(client, updated),
  });
}

export function useUnblockAdminUser() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unblockAdminUser(id),
    onSuccess: (updated) => applyUpdated(client, updated),
  });
}

export function useRevokeAdminUserSessions() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeAdminUserSessions(id),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDeleteAdminUser() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: (_result, id) => {
      patchAllLists(client, (items) => items.filter((item) => item.id !== id));
      invalidateAdmin(client);
    },
  });
}
