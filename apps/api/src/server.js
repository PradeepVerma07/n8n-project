import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './middlewares/logger.middleware.js';
import { publishService } from './modules/publish/publish.service.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 PostPilot API running at http://localhost:${env.PORT}`);
  logger.info(`📚 Swagger Documentation available at http://localhost:${env.PORT}/api/docs`);
});

// Automated 1-minute background scheduler poller
// Automatically scans every 60 seconds for due scheduled posts, publishes them, and triggers n8n
const SCHEDULER_INTERVAL_MS = 60 * 1000;
const pollerInterval = setInterval(async () => {
  try {
    const result = await publishService.processDuePosts();
    if (result.processed > 0) {
      logger.info(`⏰ [Auto-Scheduler 1-Min] Automatically posted ${result.processed} due post(s): ${result.posts.join(', ')}`);
    }
  } catch (err) {
    logger.error('Error in 1-minute automated scheduler poller:', err);
  }
}, SCHEDULER_INTERVAL_MS);

// Initial check 5s after startup
setTimeout(async () => {
  try {
    await publishService.processDuePosts();
  } catch {}
}, 5000);

/**
 * Graceful shutdown handler.
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  if (pollerInterval) clearInterval(pollerInterval);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnect:', err);
      process.exit(1);
    }
  });

  // Force exit if not gracefully shut down within 10s
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
