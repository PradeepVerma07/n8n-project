import Redis from 'ioredis';
import { env } from './env.js';

export function createRedisClient(options = {}) {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    ...options,
  });

  client.on('error', (err) => {
    // Only log if not in silent/test mode
    if (env.NODE_ENV !== 'test') {
      console.warn(`[Redis Error] ${err.message}`);
    }
  });

  return client;
}

export const redisClient = createRedisClient();
