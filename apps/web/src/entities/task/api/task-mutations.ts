'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '@repo/shared';
import {
  createTask,
  deleteTask,
  updateTask,
  updateTaskDueDate,
  updateTaskStatus,
} from '@/shared/api/tasks';
import { taskKeys } from './task-keys';

type ListsSnapshot = Array<[QueryKey, Task[] | undefined]>;

function patchTask(list: Task[], updated: Task): Task[] {
  return list.map((task) => (task.id === updated.id ? updated : task));
}

function removeTask(list: Task[], id: string): Task[] {
  return list.filter((task) => task.id !== id);
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
  client.setQueriesData<Task[]>({ queryKey: taskKeys.lists() }, (list) =>
    list ? patch(list) : list,
  );
}

function snapshotLists(client: QueryClient): ListsSnapshot {
  return client.getQueriesData<Task[]>({ queryKey: taskKeys.lists() });
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

export function useCreateTask() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: (created) => {
      // Server sorts by createdAt desc, so a new task goes first.
      // Prepend only into lists where it belongs: ALL and its own status.
      for (const key of [
        taskKeys.list('ALL'),
        taskKeys.list(created.status),
      ] as const) {
        const current = client.getQueryData<Task[]>(key);

        if (current) {
          client.setQueryData(key, prependTask(current, created));
        }
      }

      invalidateTasks(client);
    },
  });
}

export function useDeleteTask() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: (_result, id) => {
      patchAllLists(client, (list) => removeTask(list, id));
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
