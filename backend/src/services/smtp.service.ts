import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { SenderAccount } from '@prisma/client';

export interface SendMailOptions {
  senderId: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId: string;
  previewUrl: string | null;
  response: string;
}

export class SmtpService {
  // Transporter connection pool cache: senderId -> nodemailer.Transporter
  private static transporterPool: Map<string, Transporter> = new Map();
  // Round-robin rotation pointer per user: userId -> current sender index
  private static userRotationIndex: Map<string, number> = new Map();

  /**
   * Retrieves or initializes a pooled Nodemailer transporter for a given sender account
   */
  public static async getTransporter(senderId: string): Promise<{ transporter: Transporter; sender: SenderAccount }> {
    const sender = await prisma.senderAccount.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      throw new Error(`Sender account not found for id: ${senderId}`);
    }

    // Check if we have an active pooled transporter
    let transporter = this.transporterPool.get(senderId);
    if (!transporter) {
      transporter = nodemailer.createTransport({
        pool: true,
        host: sender.host,
        port: sender.port,
        secure: sender.port === 465, // true for 465, false for 587 or other ports
        auth: {
          user: sender.username,
          pass: sender.password,
        },
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14, // Max 14 messages/second per connection to prevent socket congestion
      });

      this.transporterPool.set(senderId, transporter);
    }

    return { transporter, sender };
  }

  /**
   * Verifies SMTP connection health for a sender account
   */
  public static async verifySenderConnection(senderId: string): Promise<boolean> {
    try {
      const { transporter } = await this.getTransporter(senderId);
      await transporter.verify();
      return true;
    } catch (error: any) {
      console.error(`[SmtpService] SMTP verification failed for sender ${senderId}:`, error.message);
      this.invalidateTransporter(senderId);
      return false;
    }
  }

  /**
   * Invalidate and close a cached transporter pool (e.g., on credential change or fatal auth error)
   */
  public static invalidateTransporter(senderId: string): void {
    const existing = this.transporterPool.get(senderId);
    if (existing) {
      try {
        existing.close();
      } catch (err) {
        // ignore close errors
      }
      this.transporterPool.delete(senderId);
    }
  }

  /**
   * Closes all active transporter pools during server shutdown
   */
  public static closeAllTransporters(): void {
    for (const [senderId, transporter] of this.transporterPool.entries()) {
      try {
        transporter.close();
      } catch (err) {
        // ignore close errors
      }
    }
    this.transporterPool.clear();
  }

  /**
   * Dispatches an email via the sender's pooled SMTP transporter and captures the preview URL
   */
  public static async sendMailWithSender(options: SendMailOptions): Promise<SendMailResult> {
    const { senderId, to, subject, body, html } = options;
    const { transporter, sender } = await this.getTransporter(senderId);

    try {
      const info = await transporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        to,
        subject,
        text: body,
        html: html || body,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        response: info.response,
      };
    } catch (error: any) {
      // Invalidate transporter cache if it's an authentication error
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        this.invalidateTransporter(senderId);
      }
      throw error;
    }
  }

  /**
   * Multi-Sender Rotation: Distributes recipient emails evenly round-robin across available sender accounts
   */
  public static distributeRecipientsAcrossSenders(
    senders: SenderAccount[],
    recipientEmails: string[]
  ): Array<{ recipientEmail: string; sender: SenderAccount }> {
    if (!senders || senders.length === 0) {
      throw new Error('Cannot distribute recipients: No sender accounts provided.');
    }

    return recipientEmails.map((email, index) => {
      const sender = senders[index % senders.length];
      return { recipientEmail: email, sender };
    });
  }

  /**
   * Multi-Sender Rotation: Selects the next sender account for a user in round-robin fashion
   */
  public static async getNextSenderForUser(userId: string): Promise<SenderAccount> {
    const senders = await prisma.senderAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (senders.length === 0) {
      throw new Error(`No sender accounts registered for user: ${userId}`);
    }

    const currentIndex = this.userRotationIndex.get(userId) ?? 0;
    const selectedSender = senders[currentIndex % senders.length];
    this.userRotationIndex.set(userId, (currentIndex + 1) % senders.length);

    return selectedSender;
  }

  /**
   * Auto-provisions a real Ethereal SMTP test account and registers it in the database
   */
  public static async provisionEtherealAccount(
    userId: string,
    accountName: string = 'Ethereal Test Sender'
  ): Promise<SenderAccount> {
    const testAccount = await nodemailer.createTestAccount();

    const sender = await prisma.senderAccount.create({
      data: {
        userId,
        name: accountName,
        email: testAccount.user,
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        username: testAccount.user,
        password: testAccount.pass,
        hourlyLimit: Number(process.env.MAX_EMAILS_PER_HOUR || 50),
      },
    });

    return sender;
  }
}
