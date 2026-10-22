import { prisma } from '../../config/prisma.js';
import { register } from '../../config/metrics.js';

/**
 * Health & Observability controllers.
 */
export const healthController = {
  /**
   * Liveness probe: returns 200 if process is running and responsive.
   */
  async getLiveness(req, res) {
    const memory = process.memoryUsage();
    res.status(200).json({
      status: 'UP',
      uptime: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Readiness probe: verifies Database & dependency connectivity.
   */
  async getReadiness(req, res) {
    const checks = {
      database: 'DOWN',
      timestamp: new Date().toISOString(),
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'UP';
      res.status(200).json({ status: 'READY', checks });
    } catch (err) {
      checks.database = 'DOWN';
      checks.error = err.message;
      res.status(503).json({ status: 'NOT_READY', checks });
    }
  },

  /**
   * Prometheus metrics endpoint.
   */
  async getMetrics(req, res) {
    try {
      res.setHeader('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
};
