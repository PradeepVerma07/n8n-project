import { Router } from 'express';
import { authenticate, authenticateApiKey } from '../../middlewares/auth.middleware.js';
import { publishController } from './publish.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/publish/enqueue:
 *   post:
 *     summary: Enqueue schedule rows for publishing (called by n8n WF-01 or UI)
 *     tags: [Publisher]
 *     security:
 *       - apiKeyAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, rows]
 *             properties:
 *               brandId:
 *                 type: string
 *               rows:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Rows processed and enqueued
 */
router.post(
  '/enqueue',
  (req, res, next) => {
    if (req.headers['x-api-key']) {
      return authenticateApiKey(req, res, next);
    }
    if (req.headers['authorization']) {
      return authenticate(req, res, next);
    }
    return authenticateApiKey(req, res, next);
  },
  publishController.enqueue
);

/**
 * @swagger
 * /api/v1/publish/callback:
 *   post:
 *     summary: Webhook callback from n8n WF-02 or worker with HMAC signature
 *     tags: [Publisher]
 *     parameters:
 *       - in: header
 *         name: x-postpilot-signature
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-postpilot-timestamp
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Publish result recorded
 */
router.post('/callback', publishController.webhookCallback);
router.post('/trigger-n8n-sync', publishController.triggerN8nSync);
router.post('/check-due', publishController.checkDue);
router.get('/check-due', publishController.checkDue);
router.post('/manual-test', publishController.manualTest);
router.get('/scheduler-status', publishController.getSchedulerStatus);
router.post('/toggle-scheduler', publishController.toggleScheduler);

export default router;
