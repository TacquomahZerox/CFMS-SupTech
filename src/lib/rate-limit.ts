import { RateLimitError } from '@/lib/errors';

interface RateLimitState {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitState>();

export function assertRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): void {
  const now = Date.now();
  const current = memoryStore.get(key);

  if (!current || current.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= maxAttempts) {
    throw new RateLimitError('Too many attempts. Please try again later.');
  }

  current.count += 1;
  memoryStore.set(key, current);
}

export function clearRateLimit(key: string): void {
  memoryStore.delete(key);
}
