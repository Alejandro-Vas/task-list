import { z } from 'zod';

export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.iso.datetime({ offset: true }).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  assigneeId: z.string().nullable(),
  ownerId: z.string(),
  projectId: z.string().nullable(),
  dueDate: z.string().nullable(),
  /** Set while the task waits in the deletion queue; `null` means it is safe. */
  pendingDeletionAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskDueDateSchema = z.object({
  dueDate: z.iso.datetime({ offset: true }).nullable(),
});
export type UpdateTaskDueDateInput = z.infer<typeof updateTaskDueDateSchema>;

/** How long a scheduled deletion can still be undone. */
export const UNDO_DELETE_WINDOW_MS = 5000;

export const TASK_FILTERS = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const;
export const taskFilterSchema = z.enum(TASK_FILTERS);
export type TaskFilter = z.infer<typeof taskFilterSchema>;

export const findAllTasksQuerySchema = z.object({
  status: taskFilterSchema.default('ALL'),
});
export type FindAllTasksQuery = z.infer<typeof findAllTasksQuerySchema>;

export const shareTaskResponseSchema = z.object({
  url: z.string(),
  expiresAt: z.string(),
});
export type ShareTaskResponse = z.infer<typeof shareTaskResponseSchema>;

export const sharedTaskSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  ownerName: z.string(),
});
export type SharedTask = z.infer<typeof sharedTaskSchema>;
