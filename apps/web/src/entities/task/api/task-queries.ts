'use client';

import { useQuery } from '@tanstack/react-query';
import type { TaskFilter } from '@repo/shared';
import { fetchOverdueCount, fetchTasks } from '@/shared/api/tasks';
import { taskKeys } from './task-keys';

export function useTasksQuery(status: TaskFilter) {
  return useQuery({
    queryKey: taskKeys.list(status),
    queryFn: () => fetchTasks(status),
  });
}

export function useOverdueCountQuery() {
  return useQuery({
    queryKey: taskKeys.overdueCount(),
    queryFn: fetchOverdueCount,
  });
}
