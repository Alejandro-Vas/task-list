'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchAdminLogs,
  fetchAdminStats,
  fetchAdminUsers,
} from '@/shared/api/admin-users';
import { adminKeys, type AdminUsersListKey } from './user-admin-keys';

export const ADMIN_PER_PAGE = 20;

export function useAdminUsersQuery(params: AdminUsersListKey) {
  return useQuery({
    queryKey: adminKeys.userList(params),
    queryFn: () => fetchAdminUsers(params),
    // Keeps the previous page visible while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function useAdminStatsQuery() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: fetchAdminStats,
  });
}

export function useAdminLogsQuery(page: number) {
  return useQuery({
    queryKey: adminKeys.logs(page),
    queryFn: () => fetchAdminLogs(page, ADMIN_PER_PAGE),
    placeholderData: keepPreviousData,
  });
}
