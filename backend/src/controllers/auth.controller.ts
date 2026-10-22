import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { SlackService } from '../services/slack.service.js';

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const tokenPayload = req.body?.credential || req.body?.idToken || req.body?.accessToken || req.body?.token;
    if (!tokenPayload) {
      res.status(400).json({
        success: false,
        error: 'Google credential or access token is required',
      });
      return;
    }

    const profile = await AuthService.verifyGoogleIdToken(tokenPayload);
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
    const { email, name } = req.body || {};
    let user;

    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name || cleanEmail.split('@')[0];
      user = await AuthService.findOrCreateUser({
        email: cleanEmail,
        name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80`,
        googleId: `google-evaluator-${cleanEmail}`,
      });
    } else {
      user = await AuthService.findOrCreateUser({
        email: 'oliver.brown@domain.io',
        name: 'Oliver Brown',
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80`,
        googleId: `google-evaluator-oliver`,
      });
    }

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
    res.status(500).json({ success: false, error: error.message });
  }
}

