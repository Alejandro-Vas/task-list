'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchOverdueCount, fetchTasks } from '@/shared/api/tasks';
import { taskKeys, type TasksListKey } from './task-keys';

export const TASK_PER_PAGE = 20;
export const TASK_PER_PAGE_OPTIONS = [10, 20, 50] as const;

export function useTasksQuery(params: TasksListKey) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params.status, params.page, params.perPage),
    placeholderData: keepPreviousData,
  });
}

export function useOverdueCountQuery() {
  return useQuery({
    queryKey: taskKeys.overdueCount(),
    queryFn: fetchOverdueCount,
  });
}
