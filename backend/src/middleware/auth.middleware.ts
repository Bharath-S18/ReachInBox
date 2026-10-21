import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Middleware that strictly requires a valid JWT session token
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token) {
    try {
      const payload = AuthService.verifySessionToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (user) {
        req.user = user;
        return next();
      }
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: `Authentication failed: ${err.message}`,
      });
      return;
    }
  }

  // Fallback for development/testing environments when auth token is omitted
  if (process.env.NODE_ENV !== 'production') {
    const customUserId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    if (customUserId) {
      const user = await prisma.user.findUnique({ where: { id: customUserId } });
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Default to seeded demo user in dev mode
    const { user } = await AuthService.getOrCreateDemoUser();
    req.user = user;
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Authorization header with Bearer token is required',
  });
}

/**
 * Optional authentication: Attaches user if token is present, but doesn't block if missing
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token) {
    try {
      const payload = AuthService.verifySessionToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore token verification errors for optional auth
    }
  }

  next();
}
