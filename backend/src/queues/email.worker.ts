import { Worker, Job, DelayedError } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { prisma } from '../lib/prisma.js';
import { EMAIL_QUEUE_NAME } from './email.queue.js';
import { EmailJobPayload, EmailJobResult } from '../types/queue.types.js';
import { checkRateLimit, incrementRateLimit } from '../services/rateLimiter.service.js';
import { SlackService } from '../services/slack.service.js';
import { SmtpService } from '../services/smtp.service.js';
import { ElasticsearchService } from '../services/elasticsearch.service.js';

const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);
const defaultInterEmailDelayMs = Number(process.env.MIN_SEND_DELAY_MS || 2000);
const defaultHourlyLimit = Number(process.env.MAX_EMAILS_PER_HOUR || 50);

/**
 * Hook for rate limit alerts (Phase 4 integrates live Slack notifications here)
 */
export type RateLimitAlertHandler = (alert: {
  senderId: string;
  currentCount: number;
  hourlyLimit: number;
  rescheduledTo: Date;
}) => Promise<void> | void;

let onRateLimitReached: RateLimitAlertHandler | null = null;

export function setRateLimitAlertHandler(handler: RateLimitAlertHandler) {
  onRateLimitReached = handler;
}

/**
 * Worker processor function for handling email send jobs
 */
export async function processEmailJob(
  job: Job<EmailJobPayload, EmailJobResult>
): Promise<EmailJobResult> {
  const { data } = job;
  const { jobId, senderId, recipientEmail, subject, hourlyLimit, interEmailDelayMs } = data;
  const effectiveLimit = hourlyLimit ?? defaultHourlyLimit;
  const effectiveDelay = interEmailDelayMs ?? defaultInterEmailDelayMs;

  console.log(`[Worker] Processing Job ${job.id} for recipient: ${recipientEmail}`);

  // 1. Check idempotency in DB: Never re-send an email already marked SENT
  const existingJob = await prisma.emailJob.findUnique({
    where: { id: jobId },
  });

  if (!existingJob) {
    console.log(`[INFO] [Worker] Job ${jobId} does not exist in database. Skipping.`);
    return {
      success: false,
      jobId,
      recipientEmail,
      status: 'SKIPPED',
    };
  }

  if (existingJob.status === 'SENT') {
    console.log(`[INFO] [Worker] Job ${jobId} already marked as SENT. Skipping.`);
    return {
      success: true,
      jobId,
      recipientEmail,
      status: 'SKIPPED',
      messageUrl: existingJob.etherealMessageUrl,
    };
  }

  // 2. Redis-backed Hourly Rate Limit check
  const rateCheck = await checkRateLimit(senderId, effectiveLimit);
  if (!rateCheck.allowed) {
    const rescheduledAt = new Date(Date.now() + rateCheck.msUntilReset);
    console.warn(
      `[WARN] [Worker] Sender ${senderId} reached hourly rate limit (${rateCheck.currentCount}/${effectiveLimit}). Rescheduling job ${jobId} to ${rescheduledAt.toISOString()}`
    );

    // Update job status in PostgreSQL to RESCHEDULED
    await prisma.emailJob.update({
      where: { id: jobId },
      data: {
        status: 'RESCHEDULED',
        scheduledAt: rescheduledAt,
      },
    });

    // Real-time sync to Elasticsearch (Phase 6)
    await ElasticsearchService.updateEmailJobStatus(jobId, 'RESCHEDULED', {
      scheduledAt: rescheduledAt,
    }).catch(() => null);

    // Dispatch live Slack Rate Limit Alert (Phase 4 integration)
    try {
      const senderRecord = await prisma.senderAccount.findUnique({
        where: { id: senderId },
        select: { email: true },
      });

      await SlackService.sendRateLimitAlert(data.userId, {
        senderId,
        senderEmail: senderRecord?.email || senderId,
        currentCount: rateCheck.currentCount,
        hourlyLimit: effectiveLimit,
        rescheduledTo: rescheduledAt,
      });
    } catch (slackErr) {
      console.warn('Slack rate limit alert dispatch failed gracefully:', slackErr);
    }

    // Also notify any custom registered alert hook (used for automated tests)
    if (onRateLimitReached) {
      try {
        await onRateLimitReached({
          senderId,
          currentCount: rateCheck.currentCount,
          hourlyLimit: effectiveLimit,
          rescheduledTo: rescheduledAt,
        });
      } catch (alertErr) {
        console.error('Error invoking rate limit alert handler:', alertErr);
      }
    }

    // Delay job in BullMQ to the next hour window
    await job.moveToDelayed(Date.now() + rateCheck.msUntilReset, job.token);
    throw new DelayedError();
  }

  // 3. Inter-Email Throttling Delay
  if (effectiveDelay > 0) {
    console.log(`[INFO] [Worker] Applying throttling delay: ${effectiveDelay}ms`);
    await new Promise((resolve) => setTimeout(resolve, effectiveDelay));
  }

  // 4. Update status to SENDING
  await prisma.emailJob.update({
    where: { id: jobId },
    data: {
      status: 'SENDING',
      attempts: { increment: 1 },
    },
  });

  try {
    // 5. Atomic Redis rate limit increment
    await incrementRateLimit(senderId, effectiveLimit);

    // 6. Dispatch email via pooled SMTP transport (Phase 5 Ethereal integration)
    const mailResult = await SmtpService.sendMailWithSender({
      senderId,
      to: recipientEmail,
      subject,
      body: data.body,
    });

    // 7. Complete and update DB to SENT with preview URL
    const sentAt = new Date();
    await prisma.emailJob.update({
      where: { id: jobId },
      data: {
        status: 'SENT',
        sentAt,
        etherealMessageUrl: mailResult.previewUrl,
      },
    });

    // Real-time sync to Elasticsearch (Phase 6)
    await ElasticsearchService.updateEmailJobStatus(jobId, 'SENT', {
      sentAt,
      etherealMessageUrl: mailResult.previewUrl,
    }).catch(() => null);

    console.log(`[SUCCESS] [Worker] Successfully processed job ${jobId} to ${recipientEmail}`);
    if (mailResult.previewUrl) {
      console.log(`[INFO] [Worker] Ethereal Preview URL: ${mailResult.previewUrl}`);
    }

    return {
      success: true,
      jobId,
      recipientEmail,
      status: 'SENT',
      messageUrl: mailResult.previewUrl,
    };
  } catch (error: any) {
    console.error(`[ERROR] [Worker] Failed to deliver job ${jobId}:`, error.message);

    await prisma.emailJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });

    // Real-time sync to Elasticsearch (Phase 6)
    await ElasticsearchService.updateEmailJobStatus(jobId, 'FAILED', {
      errorMessage: error.message,
    }).catch(() => null);

    throw error;
  }
}

/**
 * BullMQ Worker instance
 */
export const emailWorker = new Worker<EmailJobPayload, EmailJobResult>(
  EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: redisConfig,
    concurrency,
  }
);

emailWorker.on('ready', () => {
  console.log(`[INFO] BullMQ Email Worker initialized with concurrency: ${concurrency}`);
});

emailWorker.on('completed', (job, result) => {
  console.log(`[INFO] Job ${job.id} completed with status: ${result.status}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[ERROR] Job ${job?.id} failed:`, err.message);
});

emailWorker.on('error', (err) => {
  console.error('[ERROR] Worker internal error:', err.message);
});
