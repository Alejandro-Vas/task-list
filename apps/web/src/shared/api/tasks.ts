import type {
  CreateTaskInput,
  Task,
  TaskFilter,
  TaskStatus,
  UpdateTaskInput,
} from '@repo/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchTasks(
  status: TaskFilter = 'ALL',
): Promise<Task[]> {
  const query = status === 'ALL' ? '' : `?status=${status}`;
  const response = await fetch(`${API_URL}/api/tasks${query}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load tasks: ${response.status}`);
  }

  return response.json() as Promise<Task[]>;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.status}`);
  }

  return response.json() as Promise<Task>;
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task: ${response.status}`);
  }
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const response = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.json().catch(() => null);
    throw new Error(message?.message ?? `Failed to update task: ${response.status}`);
  }

  return response.json() as Promise<Task>;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task> {
  const response = await fetch(`${API_URL}/api/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task status: ${response.status}`);
  }

  return response.json() as Promise<Task>;
}
