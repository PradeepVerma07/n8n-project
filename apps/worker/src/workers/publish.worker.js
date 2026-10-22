import { Worker } from 'bullmq';
import { prisma } from '../config/prisma.js';
import { redisClient, createRedisClient } from '../config/redis.js';
import { adapterRegistry } from '../adapters/registry.js';
import { webhookDispatcher } from '../services/webhook-dispatcher.service.js';
import { PUBLISH_QUEUE_NAME } from '../queues/publish.queue.js';
import { env } from '../config/env.js';
import { POST_STATUS } from '@postpilot/shared';

/**
 * Core processor for social media publishing jobs.
 *
 * @param {import('bullmq').Job} job
 * @param {object} [dependencies] - Injectable dependencies for unit testing
 * @returns {Promise<object>}
 */
export async function processPublishJob(job, dependencies = {}) {
  const db = dependencies.prisma || prisma;
  const redis = dependencies.redis || redisClient;
  const registry = dependencies.adapterRegistry || adapterRegistry;
  const dispatcher = dependencies.webhookDispatcher || webhookDispatcher;

  const { idempotencyKey, postId, platform } = job.data;
  const workerId = `worker-${process.pid}-${Date.now()}`;
  const lockKey = `lock:publish:${idempotencyKey}`;
  const startTime = Date.now();

  // 1. Acquire Redis distributed lock (TTL 60s)
  const lockAcquired = await redis.set(lockKey, workerId, 'PX', 60000, 'NX');
  if (!lockAcquired) {
    const lockErr = new Error(`Job ${idempotencyKey} is currently locked by another worker process`);
    lockErr.isLockConflict = true;
    throw lockErr;
  }

  try {
    // 2. Load database entities
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        brand: {
          include: { sheetConfig: true },
        },
        platforms: true,
      },
    });

    if (!post) {
      throw new Error(`Post not found in database: ${postId}`);
    }

    const postPlatform = await db.postPlatform.findUnique({
      where: {
        postId_platform: {
          postId,
          platform,
        },
      },
    });

    // 3. Strict Idempotency check: Exit early if already published
    if (postPlatform?.status === 'PUBLISHED') {
      return {
        skipped: true,
        reason: 'Post platform has already been successfully published',
        idempotencyKey,
      };
    }

    // 4. Update status to PUBLISHING
    await db.publishJob.updateMany({
      where: { idempotencyKey },
      data: { status: 'PUBLISHING', workerId },
    });

    await db.post.update({
      where: { id: postId },
      data: { status: POST_STATUS.PUBLISHING },
    });

    // 5. Select platform adapter and execute publish
    const adapter = registry.getAdapter(platform);
    const publishResult = await adapter.publish(post);

    const latencySeconds = Math.round((Date.now() - startTime) / 1000);

    // 6. Record Success in Postgres
    await db.publishJob.updateMany({
      where: { idempotencyKey },
      data: { status: 'SUCCESS' },
    });

    await db.postPlatform.update({
      where: {
        postId_platform: {
          postId,
          platform,
        },
      },
      data: {
        status: 'PUBLISHED',
        platformPostId: publishResult.platformPostId,
        platformPostUrl: publishResult.platformPostUrl,
        publishedAtUtc: new Date(),
        errorMessage: null,
        errorCode: null,
      },
    });

    // Determine overall Post status
    const allPlatforms = await db.postPlatform.findMany({ where: { postId } });
    const allPublished = allPlatforms.every((p) => p.status === 'PUBLISHED');
    const overallStatus = allPublished ? POST_STATUS.PUBLISHED : POST_STATUS.PARTIALLY_PUBLISHED;

    await db.post.update({
      where: { id: postId },
      data: {
        status: overallStatus,
        publishedAtUtc: allPublished ? new Date() : post.publishedAtUtc,
      },
    });

    // Write to Report table
    await db.report.create({
      data: {
        brandId: post.brandId,
        postId: post.id,
        platform,
        postType: post.postType,
        scheduledLocal: post.scheduledLocal,
        timezone: post.timezone,
        scheduledUtc: post.scheduledUtc,
        attemptedAtUtc: new Date(startTime),
        publishedAtUtc: new Date(),
        status: 'SUCCESS',
        attempts: (job.attemptsMade || 0) + 1,
        platformPostId: publishResult.platformPostId,
        platformPostUrl: publishResult.platformPostUrl,
        latencySeconds,
      },
    });

    // 7. Dispatch HMAC Webhook to n8n WF-02 and Node API
    const callbackPayload = {
      postId: post.id,
      customId: post.customId,
      platform,
      status: 'SUCCESS',
      platformPostId: publishResult.platformPostId,
      platformPostUrl: publishResult.platformPostUrl,
      overallStatus,
      rowIndex: post.sheetRowIndex,
      scheduleSpreadsheetId: post.brand?.sheetConfig?.scheduleSpreadsheetId,
      scheduleSheetName: post.brand?.sheetConfig?.scheduleSheetName || 'Schedule',
      publishedAtUtc: new Date().toISOString(),
    };

    await dispatcher.dispatchPublishResult(callbackPayload);

    return {
      success: true,
      idempotencyKey,
      publishResult,
      overallStatus,
    };
  } catch (err) {
    // If it's a lock conflict, rethrow immediately
    if (err.isLockConflict) throw err;

    const attempts = (job.attemptsMade || 0) + 1;
    const maxAttempts = job.opts?.attempts || 5;
    const isFinalFailure = attempts >= maxAttempts;

    // Update PostPlatform error metrics
    await db.postPlatform.updateMany({
      where: {
        postId,
        platform,
      },
      data: {
        attempts,
        errorMessage: err.message,
        errorCode: err.code || 'PLATFORM_ERROR',
        status: isFinalFailure ? 'FAILED' : 'PENDING',
      },
    });

    if (isFinalFailure) {
      await db.publishJob.updateMany({
        where: { idempotencyKey },
        data: { status: 'FAILED' },
      });

      // Check if all platforms failed
      const remainingPlatforms = await db.postPlatform.findMany({ where: { postId } });
      const allFailed = remainingPlatforms.every((p) => p.status === 'FAILED');

      if (allFailed) {
        await db.post.update({
          where: { id: postId },
          data: { status: POST_STATUS.FAILED },
        });
      }

      // Record failure in Report table
      const latencySeconds = Math.round((Date.now() - startTime) / 1000);
      try {
        const post = await db.post.findUnique({ where: { id: postId } });
        if (post) {
          await db.report.create({
            data: {
              brandId: post.brandId,
              postId: post.id,
              platform,
              postType: post.postType,
              scheduledLocal: post.scheduledLocal,
              timezone: post.timezone,
              scheduledUtc: post.scheduledUtc,
              attemptedAtUtc: new Date(startTime),
              status: 'FAILED',
              attempts,
              errorCode: err.code || 'PLATFORM_ERROR',
              errorMessage: err.message,
              latencySeconds,
            },
          });
        }
      } catch (reportErr) {
        console.warn(`[PublishWorker] Failed to create report row: ${reportErr.message}`);
      }

      // Dispatch failure callback
      const failurePayload = {
        postId,
        platform,
        status: 'FAILED',
        errorCode: err.code || 'PLATFORM_ERROR',
        errorMessage: err.message,
        attempts,
      };
      await dispatcher.dispatchPublishResult(failurePayload);
    }

    // Rethrow error so BullMQ triggers retry backoff if attempts < maxAttempts
    throw err;
  } finally {
    // Release distributed lock
    try {
      if (lockAcquired) {
        const currentLockVal = await redis.get(lockKey);
        if (currentLockVal === workerId || dependencies.redis) {
          await redis.del(lockKey);
        }
      }
    } catch (unlockErr) {
      console.warn(`[PublishWorker] Failed to release lock ${lockKey}: ${unlockErr.message}`);
    }
  }
}

/**
 * Initializes and starts the BullMQ Worker process.
 *
 * @param {object} [connection]
 * @returns {Worker}
 */
export function startPublishWorker(connection = null) {
  const redis = connection || createRedisClient();

  const worker = new Worker(
    PUBLISH_QUEUE_NAME,
    async (job) => processPublishJob(job),
    {
      connection: redis,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} (${job.data.idempotencyKey}) completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} (${job?.data?.idempotencyKey}) failed: ${err.message}`);
  });

  return worker;
}
