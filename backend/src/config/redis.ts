import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redis: Redis | null = null;
let memoryStore: Map<string, { value: string; expiresAt?: number }> | null = null;

/**
 * Redis client with in-memory fallback for local/dev when Redis is unavailable.
 * Production should always run with Redis for multi-instance scaling.
 */
export function getRedis(): Redis | MemoryRedisAdapter {
  if (redis) return redis;

  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      logger.warn('Redis error — falling back to memory store if needed', { message: err.message });
    });

    return redis;
  } catch (error) {
    logger.warn('Redis unavailable, using memory store', { error });
    return getMemoryRedis();
  }
}

export async function connectRedis(): Promise<void> {
  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      retryStrategy: () => null,
      showFriendlyErrorStack: false,
    });
    client.on('error', () => {
      /* suppressed — fallback handled below */
    });
    await client.connect();
    await client.ping();
    redis = client;
    logger.info('Redis connected');
  } catch (error) {
    logger.warn('Redis unavailable — using in-memory adapter (single-instance only)', {
      message: error instanceof Error ? error.message : String(error),
    });
    if (redis) {
      try {
        redis.disconnect();
      } catch {
        /* ignore */
      }
      redis = null;
    }
    getMemoryRedis();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
  memoryStore = null;
}

/** Minimal Redis-compatible adapter for room/session keys when Redis is down. */
export class MemoryRedisAdapter {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && typeof ttl === 'number') {
      expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count += 1;
    }
    return count;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? '0') + 1;
    await this.set(key, String(current));
    return current;
  }

  async exists(key: string): Promise<number> {
    return (await this.get(key)) ? 1 : 0;
  }
}

function getMemoryRedis(): MemoryRedisAdapter {
  if (!memoryStore) memoryStore = new Map();
  const adapter = new MemoryRedisAdapter();
  // share backing store for singleton behaviour
  (adapter as unknown as { store: typeof memoryStore }).store = memoryStore;
  return adapter;
}
