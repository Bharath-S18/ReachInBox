import { Queue, JobsOptions } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { EmailJobPayload, EmailJobResult } from '../types/queue.types.js';

export const EMAIL_QUEUE_NAME = 'email-queue';

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
  removeOnComplete: 2000,
  removeOnFail: 5000,
};

export const emailQueue = new Queue<EmailJobPayload, EmailJobResult>(EMAIL_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions,
});

/**
 * Enqueues an individual email job with a specified delay in milliseconds.
 */
export async function enqueueEmailJob(
  payload: EmailJobPayload,
  delayMs: number = 0
) {
  return await emailQueue.add(
    'send-email',
    payload,
    {
      jobId: payload.idempotencyKey, // Idempotent by uniqueness in BullMQ
      delay: Math.max(delayMs, 0),
    }
  );
}

/**
 * Enqueues a batch of email jobs with staggered delays.
 */
export async function enqueueBulkEmailJobs(
  jobs: Array<{ payload: EmailJobPayload; delayMs: number }>
) {
  const bulkData = jobs.map((item) => ({
    name: 'send-email',
    data: item.payload,
    opts: {
      jobId: item.payload.idempotencyKey,
      delay: Math.max(item.delayMs, 0),
    },
  }));

  return await emailQueue.addBulk(bulkData);
}

/**
 * Retrieves high-level counts from the queue.
 */
export async function getQueueStats() {
  const counts = await emailQueue.getJobCounts(
    'active',
    'completed',
    'failed',
    'delayed',
    'waiting',
    'paused'
  );
  return counts;
}
