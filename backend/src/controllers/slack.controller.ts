import { Request, Response } from 'express';
import { SlackService } from '../services/slack.service.js';
import { prisma } from '../lib/prisma.js';

export class SlackController {
  /**
   * GET /api/slack/authorize
   * Redirects user to Slack OAuth authorization page
   */
  public static async authorize(req: Request, res: Response) {
    try {
      // In production/Phase 7, userId comes from JWT middleware (req.user.id).
      // For now, accept query param or default to demo user.
      let userId = (req.query.userId as string) || (req as any).user?.id;

      if (!userId) {
        const demoUser = await prisma.user.findFirst();
        userId = demoUser?.id || 'demo-user-id';
      }

      const authUrl = SlackService.getAuthorizationUrl(userId);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('Slack authorize error:', error);
      res.status(500).json({ error: error.message || 'Failed to initiate Slack OAuth' });
    }
  }

  /**
   * GET /api/slack/callback
   * Exchanges OAuth authorization code for bot tokens & incoming webhook
   */
  public static async callback(req: Request, res: Response) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.warn('Slack OAuth error returned:', error);
        return res.status(400).json({ error: `Slack OAuth rejected: ${error}` });
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing OAuth authorization code' });
      }

      const userId = (state as string) || 'demo-user-id';
      const result = await SlackService.exchangeCodeForToken(code, userId);

      // If called from a browser redirect, redirect back to dashboard
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const isBrowserRequest = req.headers.accept?.includes('text/html');

      if (isBrowserRequest) {
        return res.redirect(`${frontendUrl}?slack=connected&channel=${encodeURIComponent(result.incoming_webhook?.channel || '')}`);
      }

      return res.json({
        success: true,
        message: 'Slack workspace successfully connected',
        channel: result.incoming_webhook?.channel,
      });
    } catch (error: any) {
      console.error('Slack OAuth callback error:', error);
      res.status(500).json({ error: error.message || 'Failed to complete Slack OAuth' });
    }
  }

  /**
   * GET /api/slack/status
   * Returns current Slack connection status
   */
  public static async getStatus(req: Request, res: Response) {
    try {
      let userId = (req.query.userId as string) || (req as any).user?.id;
      if (!userId) {
        const demoUser = await prisma.user.findFirst();
        userId = demoUser?.id || 'demo-user-id';
      }

      const status = await SlackService.getStatus(userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to retrieve Slack status' });
    }
  }

  /**
   * POST /api/slack/disconnect
   * Unlinks Slack integration for current user
   */
  public static async disconnect(req: Request, res: Response) {
    try {
      let userId = (req.body.userId as string) || (req as any).user?.id;
      if (!userId) {
        const demoUser = await prisma.user.findFirst();
        userId = demoUser?.id || 'demo-user-id';
      }

      const result = await SlackService.disconnect(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to disconnect Slack' });
    }
  }

  /**
   * POST /api/slack/test-alert
   * Triggers a live test rate limit notification to Slack
   */
  public static async testAlert(req: Request, res: Response) {
    try {
      let userId = (req.body.userId as string) || (req as any).user?.id;
      if (!userId) {
        const demoUser = await prisma.user.findFirst();
        userId = demoUser?.id || 'demo-user-id';
      }

      const nextHour = new Date(Date.now() + 3600000);
      const delivered = await SlackService.sendRateLimitAlert(userId, {
        senderId: 'demo-sender@reachinbox.local',
        senderEmail: 'demo-sender@reachinbox.local',
        currentCount: 50,
        hourlyLimit: 50,
        rescheduledTo: nextHour,
      });

      res.json({
        success: true,
        delivered,
        message: delivered
          ? 'Live alert sent to Slack successfully'
          : 'Slack webhook not configured or alert skipped gracefully',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send test alert' });
    }
  }
}
