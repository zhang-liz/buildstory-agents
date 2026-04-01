import 'server-only';

const TTL_SECONDS = 300; // 5 minutes

/**
 * Lightweight cache that uses Upstash Redis when available, falls back to
 * an in-memory LRU. Designed for short-lived, read-heavy data like persona
 * classification results and brand validation scores.
 */

const memoryCache = new Map<string, { value: string; expiresAt: number }>();
const MAX_MEMORY_ENTRIES = 2000;

function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt < now) memoryCache.delete(key);
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({ url: redisUrl, token: redisToken });
      const value = await redis.get<string>(key);
      return value ?? null;
    } catch {
      // fall through to memory
    }
  }

  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  memoryCache.delete(key);
  return null;
}

export async function cacheSet(key: string, value: string, ttl: number = TTL_SECONDS): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({ url: redisUrl, token: redisToken });
      await redis.set(key, value, { ex: ttl });
      return;
    } catch {
      // fall through
    }
  }

  if (memoryCache.size >= MAX_MEMORY_ENTRIES) evictExpired();
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

/**
 * Hash a persona context into a short cache key.
 */
export function personaCacheKey(
  utmParams: Record<string, string> | undefined,
  referrer: string | undefined,
  deviceType: string | undefined,
  timeOfDay: number | undefined
): string {
  const timeBucket = timeOfDay !== undefined ? Math.floor(timeOfDay / 4) : 0;
  const parts = [
    utmParams ? Object.values(utmParams).sort().join(',') : '',
    referrer?.slice(0, 50) ?? '',
    deviceType ?? '',
    timeBucket,
  ];
  return `persona:${parts.join('|')}`;
}
