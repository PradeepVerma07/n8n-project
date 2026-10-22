import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { redisClient } from './config/redis.js';
import { startPublishWorker } from './workers/publish.worker.js';

console.log('='.repeat(60));
console.log('🚀 PostPilot Background Publish Worker Starting');
console.log(`   Environment: ${env.NODE_ENV}`);
console.log(`   Publish Mode: ${env.PUBLISH_MODE.toUpperCase()}`);
console.log(`   Concurrency: ${env.WORKER_CONCURRENCY}`);
console.log(`   Redis URL: ${env.REDIS_URL.replace(/:[^:]*@/, ':****@')}`);
console.log('='.repeat(60));

const worker = startPublishWorker();

async function handleShutdown(signal) {
  console.log(`\n[Worker] Received ${signal}. Initiating graceful shutdown...`);

  try {
    await worker.close();
    console.log('[Worker] BullMQ Worker closed.');

    await redisClient.quit();
    console.log('[Worker] Redis connection closed.');

    await prisma.$disconnect();
    console.log('[Worker] Prisma connection closed.');

    process.exit(0);
  } catch (err) {
    console.error('[Worker] Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
