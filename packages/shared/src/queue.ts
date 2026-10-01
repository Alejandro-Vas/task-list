import { z } from 'zod';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
} as const;

export const notificationJobSchema = z.object({
  taskId: z.string(),
  type: z.enum(['task_assigned', 'task_completed']),
  message: z.string(),
});
export type NotificationJob = z.infer<typeof notificationJobSchema>;
