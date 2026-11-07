import { getHourlyWindowKey, getMillisecondsUntilNextHour } from '../services/rateLimiter.service.js';

function runRateLimiterUnitTests() {
  console.log('[TEST] Running Rate Limiter Service Unit Tests...\n');

  // Test 1: Deterministic Window Key Calculation
  const fixedDate = new Date('2026-11-07T14:25:30.000Z');
  const key = getHourlyWindowKey('sender_123', fixedDate);
  const expectedKey = 'rate_limit:sender_123:2026110714';

  console.log(`[TEST 1] getHourlyWindowKey: ${key}`);
  if (key !== expectedKey) {
    throw new Error(`Expected "${expectedKey}", got "${key}"`);
  }
  console.log('   [PASS] Window key formatting matches UTC hourly boundary');

  // Test 2: Milliseconds Until Next Hour Calculation
  const msUntilNext = getMillisecondsUntilNextHour(fixedDate);
  // From 14:25:30 to 15:00:00 is exactly 34 minutes and 30 seconds = 34 * 60 * 1000 + 30 * 1000 = 2,070,000 ms
  const expectedMs = (34 * 60 + 30) * 1000;
  console.log(`[TEST 2] msUntilNextHour: ${msUntilNext} ms (Expected: ${expectedMs} ms)`);
  if (msUntilNext !== expectedMs) {
    throw new Error(`Expected ${expectedMs} ms, got ${msUntilNext} ms`);
  }
  console.log('   [PASS] Milliseconds until next hour is mathematically exact');

  // Test 3: Boundary edge case (1 millisecond before next hour)
  const boundaryDate = new Date('2026-11-07T14:59:59.999Z');
  const boundaryMs = getMillisecondsUntilNextHour(boundaryDate);
  console.log(`[TEST 3] Boundary test (1ms before hour): ${boundaryMs} ms`);
  if (boundaryMs < 1) {
    throw new Error('Boundary ms must be at least 1ms');
  }
  console.log('   [PASS] Boundary rollover handles precision without negative values');

  console.log('\n[SUCCESS] ALL RATE LIMITER UNIT TESTS PASSED!\n');
}

runRateLimiterUnitTests();
