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
  projectId: z.string().nullable(),
  dueDate: z.string().nullable(),
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

export const TASK_FILTERS = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const;
export const taskFilterSchema = z.enum(TASK_FILTERS);
export type TaskFilter = z.infer<typeof taskFilterSchema>;

export const findAllTasksQuerySchema = z.object({
  status: taskFilterSchema.default('ALL'),
});
export type FindAllTasksQuery = z.infer<typeof findAllTasksQuerySchema>;
