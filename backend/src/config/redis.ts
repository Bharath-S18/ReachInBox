import { Redis, RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST === 'localhost' || !process.env.REDIS_HOST ? '127.0.0.1' : process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '' ? process.env.REDIS_PASSWORD : undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Singleton Redis client for app-level operations (rate limiting, health checks, etc.)
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      console.log('🔌 Connected to Redis successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Connection Error:', err.message);
    });
  }

  return redisClient;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const ping = await client.ping();
    return ping === 'PONG';
  } catch (err) {
    console.error('Redis health check failed:', err);
    return false;
  }
}
