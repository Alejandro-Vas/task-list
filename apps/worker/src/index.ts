import './load-env';

import { Worker } from 'bullmq';
import { QUEUE_NAMES, notificationJobSchema } from '@repo/shared';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

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
