import { Queue } from 'bullmq';
import { createRedisClient } from '../config/redis.js';

export const PUBLISH_QUEUE_NAME = 'publish-queue';

export const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s, 16s, 32s
  },
  removeOnComplete: {
    age: 86400, // Keep completed jobs for 24 hours
    count: 2000,
  },
  removeOnFail: {
    age: 7 * 86400, // Keep failed jobs for 7 days
    count: 5000,
  },
};

/**
 * Creates and initializes the BullMQ publish queue.
 *
 * @param {object} [connection]
 * @returns {Queue}
 */
export function createPublishQueue(connection = null) {
  const redis = connection || createRedisClient();

  return new Queue(PUBLISH_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions,
  });
}

export const publishQueue = createPublishQueue();
