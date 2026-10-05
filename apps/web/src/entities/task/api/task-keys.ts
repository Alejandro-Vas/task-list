import type { TaskFilter } from '@repo/shared';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (status: TaskFilter) => [...taskKeys.lists(), status] as const,
  overdueCount: () => [...taskKeys.all, 'overdue-count'] as const,
};
