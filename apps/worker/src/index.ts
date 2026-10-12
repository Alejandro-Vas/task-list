import './load-env';

import { Worker } from 'bullmq';
import { createPrismaClient } from '@repo/db';
import {
  QUEUE_NAMES,
  notificationJobSchema,
  taskDeletionJobSchema,
} from '@repo/shared';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const prisma = createPrismaClient();

const worker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    const payload = notificationJobSchema.parse(job.data);

    console.log(
      `[worker] processing job ${job.id} (${payload.type}): ${payload.message}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    return { processedAt: new Date().toISOString() };
  },
  { connection },
);

worker.on('completed', (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`[worker] job ${job?.id} failed: ${error.message}`);
});

console.log(`[worker] listening on queue "${QUEUE_NAMES.NOTIFICATIONS}"`);

/**
 * Runs once the undo window has passed. The row is removed only while it still
 * carries the very stamp from the payload, which makes this job idempotent:
 * after "Undo" cleared `pendingDeletionAt` (or a newer delete request replaced
 * it) the `where` matches nothing and the task stays alive.
 */
const deletionWorker = new Worker(
  QUEUE_NAMES.TASK_DELETION,
  async (job) => {
    const { taskId, scheduledFor } = taskDeletionJobSchema.parse(job.data);

    const removed = await prisma.task.deleteMany({
      where: { id: taskId, pendingDeletionAt: new Date(scheduledFor) },
    });

    const deleted = removed.count > 0;

    console.log(
      deleted
        ? `[worker] task ${taskId} deleted permanently`
        : `[worker] task ${taskId} kept: deletion was cancelled`,
    );

    return { deleted };
  },
  { connection },
);

deletionWorker.on('failed', (job, error) => {
  console.error(`[worker] deletion job ${job?.id} failed: ${error.message}`);
});

console.log(`[worker] listening on queue "${QUEUE_NAMES.TASK_DELETION}"`);
