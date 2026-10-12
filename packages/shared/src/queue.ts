import { z } from 'zod';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  TASK_DELETION: 'task-deletion',
} as const;

export const notificationJobSchema = z.object({
  taskId: z.string(),
  type: z.enum(['task_assigned', 'task_completed']),
  message: z.string(),
});
export type NotificationJob = z.infer<typeof notificationJobSchema>;

export const taskDeletionJobSchema = z.object({
  taskId: z.string(),
  /**
   * Echoes `Task.pendingDeletionAt`. The worker deletes only while the column
   * still holds the same value, so a cancelled (undone) task is never removed
   * by a job that was scheduled before the cancellation.
   */
  scheduledFor: z.string(),
});
export type TaskDeletionJob = z.infer<typeof taskDeletionJobSchema>;
