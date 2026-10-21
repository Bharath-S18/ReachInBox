import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { SmtpService } from '../services/smtp.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function getSenders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const senders = await prisma.senderAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        host: true,
        port: true,
        username: true,
        hourlyLimit: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: senders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createSender(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.body.userId as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { type, name, email, host, port, username, password, hourlyLimit = 50 } = req.body;

    // Auto-provision real Ethereal account if requested or credentials omitted
    if (type === 'ethereal' || (!host && !password)) {
      const sender = await SmtpService.provisionEtherealAccount(
        userId,
        name || 'Ethereal Test Sender'
      );

      res.status(201).json({
        success: true,
        message: 'Ethereal sender account provisioned successfully',
        data: {
          id: sender.id,
          name: sender.name,
          email: sender.email,
          host: sender.host,
          port: sender.port,
          hourlyLimit: sender.hourlyLimit,
        },
      });
      return;
    }

    // Custom SMTP account validation
    if (!email || !host || !port || !username || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required SMTP fields: email, host, port, username, password',
      });
      return;
    }

    const sender = await prisma.senderAccount.create({
      data: {
        userId,
        name: name || email,
        email,
        host,
        port: Number(port),
        username,
        password,
        hourlyLimit: Number(hourlyLimit) || 50,
      },
    });

    // Verify connection health
    const isHealthy = await SmtpService.verifySenderConnection(sender.id);

    res.status(201).json({
      success: true,
      verified: isHealthy,
      data: {
        id: sender.id,
        name: sender.name,
        email: sender.email,
        host: sender.host,
        port: sender.port,
        hourlyLimit: sender.hourlyLimit,
      },
    });
  } catch (error: any) {
    console.error('Error creating sender account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteSender(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const id = req.params.id as string;

    const sender = await prisma.senderAccount.findFirst({
      where: { id, userId },
    });

    if (!sender) {
      res.status(404).json({ success: false, error: 'Sender account not found' });
      return;
    }

    SmtpService.invalidateTransporter(id);
    await prisma.senderAccount.delete({ where: { id } });

    res.json({ success: true, message: 'Sender account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
