import 'server-only';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  /** Prefix for the rate limit key (e.g. 'rewrite', 'track') */
  prefix: string;
}

const inMemoryStores = new Map<string, Map<string, { count: number; resetTime: number }>>();

function getInMemoryStore(prefix: string): Map<string, { count: number; resetTime: number }> {
  let store = inMemoryStores.get(prefix);
  if (!store) {
    store = new Map();
    inMemoryStores.set(prefix, store);
  }
  return store;
}

/**
 * Check rate limit. Returns true if the request is allowed, false if limit exceeded.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set;
 * otherwise falls back to in-memory (per-instance).
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<boolean> {
  const { windowMs, maxRequests, prefix } = options;
  const key = `rl:${prefix}:${identifier}`;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({ url: redisUrl, token: redisToken });
      const windowSec = Math.ceil(windowMs / 1000);
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      return count <= maxRequests;
    } catch (error) {
      console.warn('Rate limit Redis failed, falling back to in-memory:', error);
    }
  }

  // In-memory fallback
  const now = Date.now();
  const store = getInMemoryStore(prefix);
  const current = store.get(key);

  if (!current || now > current.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}
