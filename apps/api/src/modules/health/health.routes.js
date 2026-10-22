import { Router } from 'express';
import { healthController } from './health.controller.js';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is running
 */
router.get('/health', healthController.getLiveness);

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service and dependencies are ready to accept traffic
 *       503:
 *         description: One or more dependencies are unavailable
 */
router.get('/ready', healthController.getReadiness);

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [Observability]
 *     responses:
 *       200:
 *         description: Prometheus formatted application metrics
 */
router.get('/metrics', healthController.getMetrics);

export default router;
