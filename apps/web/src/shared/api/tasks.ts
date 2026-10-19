import type {
  CreateTaskInput,
  ShareTaskResponse,
  SharedTask,
  Task,
  TaskFilter,
  TaskStatus,
  UpdateTaskInput,
} from '@repo/shared';
import { ApiError, authedFetch, readBlob, readJson, readVoid } from './client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchTasks(
  status: TaskFilter = 'ALL',
): Promise<Task[]> {
  const query = status === 'ALL' ? '' : `?status=${status}`;
  const response = await authedFetch(`/api/tasks${query}`);

  return readJson<Task[]>(response);
}

export async function fetchOverdueCount(): Promise<number> {
  const response = await authedFetch('/api/tasks/overdue/count');
  const data = await readJson<{ count: number }>(response);

  return data.count;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await authedFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return readJson<Task>(response);
}

/** Schedules the deletion; the task stays in the list until the worker removes it. */
export async function deleteTask(id: string): Promise<Task> {
  const response = await authedFetch(`/api/tasks/${id}`, { method: 'DELETE' });

  return readJson<Task>(response);
}

export async function undoDeleteTask(id: string): Promise<Task> {
  const response = await authedFetch(`/api/tasks/${id}/undo-delete`, {
    method: 'PATCH',
  });

  return readJson<Task>(response);
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const response = await authedFetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return readJson<Task>(response);
}

export async function updateTaskDueDate(
  id: string,
  dueDate: string | null,
): Promise<Task> {
  const response = await authedFetch(`/api/tasks/${id}/due-date`, {
    method: 'PATCH',
    body: JSON.stringify({ dueDate }),
  });

  return readJson<Task>(response);
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task> {
  const response = await authedFetch(`/api/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return readJson<Task>(response);
}

export async function fetchTasksCsv(): Promise<Blob> {
  const response = await authedFetch('/api/tasks/export/csv');

  return readBlob(response);
}

export async function shareTask(id: string): Promise<ShareTaskResponse> {
  const response = await authedFetch(`/api/tasks/${id}/share`, {
    method: 'POST',
  });

  return readJson<ShareTaskResponse>(response);
}

export async function revokeShareTask(id: string): Promise<void> {
  const response = await authedFetch(`/api/tasks/${id}/share`, {
    method: 'DELETE',
  });

  return readVoid(response);
}

export async function fetchSharedTask(token: string): Promise<SharedTask> {
  const response = await fetch(`${API_URL}/api/share/${token}`);

  if (!response.ok) {
    const message = await response.text().catch(() => 'Not found');
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<SharedTask>;
}