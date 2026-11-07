import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Middleware that strictly requires a valid Google OAuth JWT session token.
 * Unauthenticated requests are immediately rejected with 401 Unauthorized.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in with Google.',
    });
    return;
  }

  try {
    const payload = AuthService.verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authenticated user no longer exists.',
      });
      return;
    }

    req.user = user;
    return next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: `Authentication failed: ${err.message}`,
    });
    return;
  }
}

/**
 * Optional authentication: Attaches user if valid token is present, but doesn't block if missing
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
      // Ignored for optional auth
    }
  }

  return next();
}
