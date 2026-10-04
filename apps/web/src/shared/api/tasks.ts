import type {
  CreateTaskInput,
  Task,
  TaskFilter,
  TaskStatus,
  UpdateTaskInput,
} from '@repo/shared';
import { authedFetch, readJson } from './client';

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

export async function deleteTask(id: string): Promise<void> {
  await authedFetch(`/api/tasks/${id}`, { method: 'DELETE' });
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
