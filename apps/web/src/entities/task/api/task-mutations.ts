'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  UNDO_DELETE_WINDOW_MS,
  type CreateTaskInput,
  type Task,
  type TaskFilter,
  type TasksPage,
  type TaskStatus,
  type UpdateTaskInput,
} from '@repo/shared';
import {
  createTask,
  deleteTask,
  shareTask,
  undoDeleteTask,
  updateTask,
  updateTaskDueDate,
  updateTaskStatus,
} from '@/shared/api/tasks';
import { taskKeys } from './task-keys';

type ListsSnapshot = Array<[QueryKey, TasksPage | undefined]>;

function patchTask(list: Task[], updated: Task): Task[] {
  return list.map((task) => (task.id === updated.id ? updated : task));
}

function prependTask(list: Task[], created: Task): Task[] {
  if (list.some((task) => task.id === created.id)) {
    return list;
  }

  return [created, ...list];
}

function patchAllLists(
  client: QueryClient,
  patch: (list: Task[]) => Task[],
): void {
  client.setQueriesData<TasksPage>({ queryKey: taskKeys.lists() }, (page) =>
    page ? { ...page, items: patch(page.items) } : page,
  );
}

/** Key shape is `[...lists(), status, page, perPage]`, so status sits at index 2. */
function prependToFirstPages(client: QueryClient, created: Task): void {
  const entries = client.getQueriesData<TasksPage>({
    queryKey: taskKeys.lists(),
  });

  for (const [key, data] of entries) {
    if (!data || data.page !== 1) {
      continue;
    }

    const status = key[2] as TaskFilter;

    if (status !== 'ALL' && status !== created.status) {
      continue;
    }

    client.setQueryData(key, {
      ...data,
      items: prependTask(data.items, created),
      total: data.total + 1,
    });
  }
}

function snapshotLists(client: QueryClient): ListsSnapshot {
  return client.getQueriesData<TasksPage>({ queryKey: taskKeys.lists() });
}

function restoreLists(client: QueryClient, snapshot: ListsSnapshot): void {
  for (const [key, data] of snapshot) {
    if (data) {
      client.setQueryData(key, data);
    }
  }
}

function invalidateTasks(client: QueryClient): void {
  client.invalidateQueries({ queryKey: taskKeys.all });
}

let refetchTimer: ReturnType<typeof setTimeout> | null = null;

/** Refetch the lists once, shortly after the undo window expires. */
function scheduleTasksRefetch(client: QueryClient, delayMs: number): void {
  if (refetchTimer) {
    clearTimeout(refetchTimer);
  }

  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    invalidateTasks(client);
  }, delayMs);
}

export function useCreateTask() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: (created) => {
      // Server sorts by createdAt desc, so a new task goes on page 1 of every
      // list it belongs to: ALL and its own status, at any cached page size.
      prependToFirstPages(client, created);

      invalidateTasks(client);
    },
  });
}

export function useDeleteTask() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: (updated) => {
      // Keep the task in the list but mark it as pending deletion so the UI
      // can show an "Undo" button.
      patchAllLists(client, (list) =>
        list.map((task) =>
          task.id === updated.id
            ? { ...task, pendingDeletionAt: updated.pendingDeletionAt }
            : task,
        ),
      );

      // The worker removes the row a moment after the window expires; refetch
      // then so the task disappears from the list on its own.
      scheduleTasksRefetch(client, UNDO_DELETE_WINDOW_MS + 500);
    },
  });
}

export function useUndoDeleteTask() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => undoDeleteTask(id),
    onSuccess: (updated) => {
      patchAllLists(client, (list) =>
        list.map((task) =>
          task.id === updated.id ? { ...task, pendingDeletionAt: null } : task,
        ),
      );
      invalidateTasks(client);
    },
  });
}

export function useUpdateTask() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: (updated) => {
      patchAllLists(client, (list) => patchTask(list, updated));
      invalidateTasks(client);
    },
  });
}

export function useUpdateTaskDueDate() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string | null }) =>
      updateTaskDueDate(id, dueDate),
    onSuccess: (updated) => {
      patchAllLists(client, (list) => patchTask(list, updated));
      invalidateTasks(client);
    },
  });
}

export function useChangeTaskStatus() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await client.cancelQueries({ queryKey: taskKeys.lists() });
      const snapshot = snapshotLists(client);

      patchAllLists(client, (list) => {
        const target = list.find((task) => task.id === id);

        return target ? patchTask(list, { ...target, status }) : list;
      });

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        restoreLists(client, context.snapshot);
      }
    },
    onSettled: () => {
      invalidateTasks(client);
    },
  });
}

export function useShareTask() {
  return useMutation({
    mutationFn: shareTask,
  });
}
