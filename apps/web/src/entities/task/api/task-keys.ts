import type { TaskFilter } from '@repo/shared';

export type TasksListKey = {
  status: TaskFilter;
  page: number;
  perPage: number;
};

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: ({ status, page, perPage }: TasksListKey) =>
    [...taskKeys.lists(), status, page, perPage] as const,
  overdueCount: () => [...taskKeys.all, 'overdue-count'] as const,
};
