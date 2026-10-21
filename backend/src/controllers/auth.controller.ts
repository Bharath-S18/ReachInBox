import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { SlackService } from '../services/slack.service.js';

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({
        success: false,
        error: 'Google credential (ID token) is required',
      });
      return;
    }

    const profile = await AuthService.verifyGoogleIdToken(credential);
    const user = await AuthService.findOrCreateUser(profile);
    const token = AuthService.generateSessionToken(user);

    const slackStatus = await SlackService.getStatus(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      slack: slackStatus,
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error.message);
    res.status(401).json({
      success: false,
      error: error.message || 'Google authentication failed',
    });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const slackStatus = await SlackService.getStatus(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      slack: slackStatus,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function demoAuth(req: Request, res: Response): Promise<void> {
  try {
    const { user, token } = await AuthService.getOrCreateDemoUser();
    const slackStatus = await SlackService.getStatus(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      slack: slackStatus,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
