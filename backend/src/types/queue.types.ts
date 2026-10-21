export interface EmailJobPayload {
  jobId: string; // Corresponds to EmailJob.id in Prisma DB
  idempotencyKey: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  hourlyLimit?: number;
  interEmailDelayMs?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  msUntilReset: number;
  windowKey: string;
}

export interface EmailJobResult {
  success: boolean;
  jobId: string;
  recipientEmail: string;
  status: 'SENT' | 'RESCHEDULED' | 'FAILED' | 'SKIPPED';
  messageUrl?: string | null;
  rescheduledTo?: string;
  error?: string;
}
