import axios from 'axios';
import { prisma } from '../lib/prisma.js';

export interface SlackTokenResponse {
  ok: boolean;
  error?: string;
  app_id?: string;
  authed_user?: {
    id: string;
  };
  team?: {
    id: string;
    name: string;
  };
  channel?: string;
  channel_id?: string;
  configuration_url?: string;
  url?: string;
  access_token?: string;
  token_type?: string;
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}

export interface RateLimitAlertData {
  senderId: string;
  senderEmail?: string;
  currentCount: number;
  hourlyLimit: number;
  rescheduledTo: Date;
}

export class SlackService {
  private static clientId = process.env.SLACK_CLIENT_ID || '';
  private static clientSecret = process.env.SLACK_CLIENT_SECRET || '';
  private static redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

  /**
   * Generates the Slack OAuth v2 authorization redirect URL
   */
  public static getAuthorizationUrl(userId: string): string {
    const scopes = ['incoming-webhook', 'chat:write'].join(',');
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: userId,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access token and incoming webhook using axios
   */
  public static async exchangeCodeForToken(code: string, userId: string): Promise<SlackTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    const response = await axios.post<SlackTokenResponse>(
      'https://slack.com/api/oauth.v2.access',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 8000,
      }
    );

    const data = response.data;

    if (!data.ok) {
      throw new Error(`Slack OAuth exchange failed: ${data.error || 'Unknown error'}`);
    }

    // Persist integration to database
    const accessToken = data.access_token || '';
    const incomingWebhookUrl = data.incoming_webhook?.url || process.env.SLACK_WEBHOOK_URL || null;
    const channelId = data.incoming_webhook?.channel_id || null;
    const channelName = data.incoming_webhook?.channel || null;
    const slackTeamId = data.team?.id || null;

    await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        accessToken,
        incomingWebhookUrl,
        channelId,
        channelName,
        slackTeamId,
        connectedAt: new Date(),
      },
      create: {
        userId,
        accessToken,
        incomingWebhookUrl,
        channelId,
        channelName,
        slackTeamId,
      },
    });

    return data;
  }

  /**
   * Gets current Slack connection status for a user
   */
  public static async getStatus(userId: string) {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    if (!integration) {
      // Check if fallback webhook URL is globally configured in environment
      const globalWebhook = process.env.SLACK_WEBHOOK_URL;
      if (globalWebhook && globalWebhook.trim() !== '') {
        return {
          connected: true,
          mode: 'GLOBAL_WEBHOOK',
          channelName: 'default-webhook-channel',
          connectedAt: new Date().toISOString(),
        };
      }

      return {
        connected: false,
        mode: 'NONE',
        channelName: null,
        connectedAt: null,
      };
    }

    return {
      connected: true,
      mode: 'OAUTH',
      channelName: integration.channelName || 'Slack Channel',
      connectedAt: integration.connectedAt.toISOString(),
      teamId: integration.slackTeamId,
    };
  }

  /**
   * Disconnects Slack integration for a user
   */
  public static async disconnect(userId: string) {
    try {
      await prisma.slackIntegration.delete({
        where: { userId },
      });
      return { success: true };
    } catch {
      // If record not found, still treat as disconnected
      return { success: true };
    }
  }

  /**
   * Sends a live formatted rate limit alert to Slack using axios
   * Gracefully falls back if Slack is not connected without crashing!
   */
  public static async sendRateLimitAlert(
    userId: string,
    alert: RateLimitAlertData
  ): Promise<boolean> {
    try {
      // 1. Look up user's Slack integration
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      });

      const webhookUrl = integration?.incomingWebhookUrl || process.env.SLACK_WEBHOOK_URL;

      // Graceful fallback: If no webhook URL is found, log cleanly and exit safely
      if (!webhookUrl || webhookUrl.trim() === '') {
        console.log(
          `ℹ️ [SlackAlert] User ${userId} has not connected Slack. Gracefully skipping Slack alert.`
        );
        return false;
      }

      const senderDisplay = alert.senderEmail || alert.senderId;
      const rescheduleTime = alert.rescheduledTo.toUTCString();

      // Formatted Slack message using Block Kit
      const messagePayload = {
        text: `⚠️ Rate Limit Alert: Sender ${senderDisplay} reached hourly threshold`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ ReachInbox Hourly Rate Limit Reached',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n\`${senderDisplay}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Quota:*\n\`${alert.currentCount} / ${alert.hourlyLimit} emails\``,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Reschedule Policy:*\nPreserved in BullMQ queue`,
              },
              {
                type: 'mrkdwn',
                text: `*Next Send Window:*\n\`${rescheduleTime}\``,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `🔒 _Idempotent scheduler: Zero emails will be dropped or duplicated._`
              },
            ],
          },
        ],
      };

      await axios.post(webhookUrl, messagePayload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });

      console.log(`📢 [SlackAlert] Real-time rate limit notification delivered to Slack successfully!`);
      return true;
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        console.warn(`⚠️ [SlackAlert] Slack webhook returned HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      } else {
        console.error(`⚠️ [SlackAlert] Error dispatching Slack rate limit alert:`, err.message);
      }
      return false;
    }
  }
}
