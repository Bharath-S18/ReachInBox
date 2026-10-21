import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { enqueueEmailJob } from '../queues/email.queue.js';
import { ElasticsearchService } from '../services/elasticsearch.service.js';
import { SmtpService } from '../services/smtp.service.js';
import { parseAndValidateLeadEmails } from '../lib/csvParser.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { EmailJobStatus } from '@prisma/client';

/**
 * POST /api/emails/schedule
 * Batch recipient parsing (CSV / Array), DB insertion, Elasticsearch sync, and BullMQ delayed scheduling
 */
export async function scheduleEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string) || (req.body.userId as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const {
      subject,
      body,
      recipients,
      csvContent,
      startTime,
      scheduledAt,
      interEmailDelayMs = 2000,
      hourlyLimit = 50,
      senderId,
    } = req.body;

    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      res.status(400).json({ success: false, error: 'Subject is required' });
      return;
    }

    if (!body || typeof body !== 'string' || body.trim() === '') {
      res.status(400).json({ success: false, error: 'Email body is required' });
      return;
    }

    // 1. Parse and validate recipient emails
    const rawInput = recipients || csvContent;
    if (!rawInput) {
      res.status(400).json({ success: false, error: 'Recipients list or CSV content is required' });
      return;
    }

    const { validEmails, totalParsed, invalidCount } = parseAndValidateLeadEmails(rawInput);
    if (validEmails.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid recipient email addresses found in input',
        totalParsed,
        invalidCount,
      });
      return;
    }

    // 2. Resolve sender accounts
    let senders = await prisma.senderAccount.findMany({
      where: { userId },
    });

    // If a specific senderId was specified, verify it exists
    let chosenSender = senders.find((s) => s.id === senderId);

    // If no senders exist at all for this user, automatically provision an Ethereal test sender
    if (!chosenSender && senders.length === 0) {
      chosenSender = await SmtpService.provisionEtherealAccount(userId, 'Primary Ethereal Sender');
      senders = [chosenSender];
    } else if (!chosenSender) {
      // Pick first available sender
      chosenSender = senders[0];
    }

    // 3. Stagger schedules
    const baseStartTime = startTime || scheduledAt ? new Date(startTime || scheduledAt) : new Date();
    const effectiveBaseTime = isNaN(baseStartTime.getTime()) ? new Date() : baseStartTime;
    const delayStepMs = Math.max(0, Number(interEmailDelayMs) || 0);

    const createdJobs: any[] = [];

    for (let i = 0; i < validEmails.length; i++) {
      const recipientEmail = validEmails[i];
      // Round-robin sender rotation across available user accounts if multiple exist
      const sender = senders[i % senders.length] || chosenSender;

      const jobScheduledAt = new Date(effectiveBaseTime.getTime() + i * delayStepMs);
      const idempotencyKey = `idemp_${userId}_${recipientEmail}_${Date.now()}_${i}`;

      // A. Create record in PostgreSQL
      const emailJob = await prisma.emailJob.create({
        data: {
          idempotencyKey,
          userId,
          senderId: sender.id,
          recipientEmail,
          subject,
          body,
          scheduledAt: jobScheduledAt,
          status: 'SCHEDULED',
        },
      });

      // B. Index in Elasticsearch in real time
      await ElasticsearchService.indexEmailJob({
        jobId: emailJob.id,
        userId,
        senderId: sender.id,
        recipientEmail,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: jobScheduledAt,
        createdAt: emailJob.createdAt,
      }).catch(() => null);

      // C. Enqueue delayed job in BullMQ
      const initialDelay = Math.max(0, jobScheduledAt.getTime() - Date.now());
      await enqueueEmailJob(
        {
          jobId: emailJob.id,
          idempotencyKey,
          userId,
          senderId: sender.id,
          recipientEmail,
          subject,
          body,
          scheduledAt: jobScheduledAt.toISOString(),
          hourlyLimit: Number(hourlyLimit) || sender.hourlyLimit || 50,
          interEmailDelayMs: delayStepMs,
        },
        initialDelay
      );

      createdJobs.push({
        id: emailJob.id,
        recipientEmail,
        senderEmail: sender.email,
        scheduledAt: jobScheduledAt,
      });
    }

    res.json({
      success: true,
      message: `Successfully scheduled ${createdJobs.length} email job(s)`,
      totalLeads: createdJobs.length,
      invalidCount,
      startTime: effectiveBaseTime.toISOString(),
      staggerDelayMs: delayStepMs,
      jobs: createdJobs.slice(0, 10), // Return sample of first 10
    });
  } catch (error: any) {
    console.error('Email scheduling error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to schedule emails' });
  }
}

/**
 * GET /api/emails/scheduled
 * Paginated list of upcoming jobs (SCHEDULED, PENDING, RESCHEDULED)
 */
export async function getScheduledEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const statusParam = req.query.status as string;
    const statusFilter: EmailJobStatus[] = statusParam
      ? [statusParam.toUpperCase() as EmailJobStatus]
      : ['SCHEDULED', 'PENDING', 'RESCHEDULED'];

    const where = {
      userId,
      status: { in: statusFilter },
    };

    const [total, jobs] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: jobs.map((j) => ({
        id: j.id,
        recipientEmail: j.recipientEmail,
        subject: j.subject,
        body: j.body,
        status: j.status,
        scheduledAt: j.scheduledAt,
        sender: j.sender,
        createdAt: j.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/emails/sent
 * Paginated list of delivered and failed jobs with Ethereal preview links
 */
export async function getSentEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const statusParam = req.query.status as string;
    const statusFilter: EmailJobStatus[] = statusParam
      ? [statusParam.toUpperCase() as EmailJobStatus]
      : ['SENT', 'FAILED'];

    const where = {
      userId,
      status: { in: statusFilter },
    };

    const [total, jobs] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: jobs.map((j) => ({
        id: j.id,
        recipientEmail: j.recipientEmail,
        subject: j.subject,
        body: j.body,
        status: j.status,
        scheduledAt: j.scheduledAt,
        sentAt: j.sentAt,
        etherealMessageUrl: j.etherealMessageUrl,
        errorMessage: j.errorMessage,
        sender: j.sender,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/emails/stats
 * Aggregated metrics: total, scheduled, sent, failed, rescheduled
 */
export async function getEmailStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const [total, scheduled, sent, failed, rescheduled] = await Promise.all([
      prisma.emailJob.count({ where: { userId } }),
      prisma.emailJob.count({ where: { userId, status: { in: ['SCHEDULED', 'PENDING'] } } }),
      prisma.emailJob.count({ where: { userId, status: 'SENT' } }),
      prisma.emailJob.count({ where: { userId, status: 'FAILED' } }),
      prisma.emailJob.count({ where: { userId, status: 'RESCHEDULED' } }),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        scheduled,
        sent,
        failed,
        rescheduled,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/emails/search
 * Full-text multi-field search across recipientEmail, subject, and body
 */
export async function searchEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const userId = req.user?.id || (req.query.userId as string) || 'demo-user-id';

    const result = await ElasticsearchService.searchEmails({
      userId,
      query,
      status,
      page: isNaN(page) || page < 1 ? 1 : page,
      limit: isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error handling email search request:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search emails',
    });
  }
}
