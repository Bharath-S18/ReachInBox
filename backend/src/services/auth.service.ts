import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { User } from '@prisma/client';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-reachinbox-jwt-key-2025';
const JWT_EXPIRES_IN = '7d';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface GoogleUserProfile {
  email: string;
  name: string;
  avatar?: string;
  googleId: string;
}

export class AuthService {
  /**
   * Cryptographically verifies Google ID Token using official google-auth-library
   */
  public static async verifyGoogleIdToken(idToken: string): Promise<GoogleUserProfile> {
    if (!idToken) {
      throw new Error('Google ID token is required');
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID : undefined,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Failed to retrieve verified email from Google ID Token');
      }

      return {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture,
        googleId: payload.sub,
      };
    } catch (error: any) {
      // In development / testing environments, allow a structured mock token
      if (process.env.NODE_ENV !== 'production' && idToken.startsWith('mock-google-token:')) {
        const parts = idToken.split(':');
        const email = parts[1] || 'demo@reachinbox.local';
        const name = parts[2] || 'Mock Google User';
        return {
          email,
          name,
          googleId: `google-mock-${Date.now()}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        };
      }

      throw new Error(`Invalid Google ID Token: ${error.message}`);
    }
  }

  /**
   * Upserts a user in PostgreSQL based on Google profile
   */
  public static async findOrCreateUser(profile: GoogleUserProfile): Promise<User> {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        avatar: profile.avatar,
      },
      create: {
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
      },
    });

    return user;
  }

  /**
   * Generates a signed session JWT for authenticated API requests
   */
  public static generateSessionToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verifies and decodes a session JWT
   */
  public static verifySessionToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error: any) {
      throw new Error(`Invalid or expired session token: ${error.message}`);
    }
  }

  /**
   * Creates or retrieves a persistent demo user for fast evaluation and testing
   */
  public static async getOrCreateDemoUser(): Promise<{ user: User; token: string }> {
    const user = await prisma.user.upsert({
      where: { email: 'demo@reachinbox.local' },
      update: { name: 'ReachInbox Demo User' },
      create: {
        email: 'demo@reachinbox.local',
        name: 'ReachInbox Demo User',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
      },
    });

    const token = this.generateSessionToken(user);
    return { user, token };
  }
}
