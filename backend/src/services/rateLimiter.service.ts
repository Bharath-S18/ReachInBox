import { getRedisClient } from '../config/redis.js';
import { RateLimitCheckResult } from '../types/queue.types.js';

/**
 * Calculates the Redis key for the current hourly rate limiting window.
 * Format: rate_limit:{senderId}:{YYYYMMDDHH}
 */
export function getHourlyWindowKey(senderId: string, date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `rate_limit:${senderId}:${year}${month}${day}${hour}`;
}

/**
 * Computes exact milliseconds remaining until the current UTC hour window rolls over to the next hour.
 */
export function getMillisecondsUntilNextHour(date: Date = new Date()): number {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return Math.max(nextHour.getTime() - date.getTime(), 1000);
}

/**
 * Checks if a sender has exceeded their hourly limit without incrementing.
 */
export async function checkRateLimit(
  senderId: string,
  hourlyLimit: number
): Promise<RateLimitCheckResult> {
  const redis = getRedisClient();
  const windowKey = getHourlyWindowKey(senderId);
  const msUntilReset = getMillisecondsUntilNextHour();

  const countStr = await redis.get(windowKey);
  const currentCount = countStr ? parseInt(countStr, 10) : 0;

  return {
    allowed: currentCount < hourlyLimit,
    currentCount,
    limit: hourlyLimit,
    msUntilReset,
    windowKey,
  };
}

/**
 * Atomically increments the sender's sent counter in Redis for the current hourly window.
 * Sets TTL automatically on key creation.
 */
export async function incrementRateLimit(
  senderId: string,
  hourlyLimit: number
): Promise<RateLimitCheckResult> {
  const redis = getRedisClient();
  const windowKey = getHourlyWindowKey(senderId);
  const msUntilReset = getMillisecondsUntilNextHour();

  const currentCount = await redis.incr(windowKey);

  // If first count in this window, set TTL slightly past window end (e.g. 2 hours)
  if (currentCount === 1) {
    const ttlSeconds = Math.ceil(msUntilReset / 1000) + 3600;
    await redis.expire(windowKey, ttlSeconds);
  }

  return {
    allowed: currentCount <= hourlyLimit,
    currentCount,
    limit: hourlyLimit,
    msUntilReset,
    windowKey,
  };
}
