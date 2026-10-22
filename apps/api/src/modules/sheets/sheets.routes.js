import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';
import { sheetsController } from './sheets.controller.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/sheets/test-connection:
 *   post:
 *     summary: Test connectivity and permissions to a Google Sheet
 *     tags: [Google Sheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/test-connection', sheetsController.testConnection);

router.use(requireTenant);

/**
 * @swagger
 * /api/v1/sheets/config/{brandId}:
 *   get:
 *     summary: Get Google Sheets configuration for a brand
 *     tags: [Google Sheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/config/:brandId', sheetsController.getConfig);

/**
 * @swagger
 * /api/v1/sheets/config/{brandId}:
 *   post:
 *     summary: Update Google Sheets configuration for a brand
 *     tags: [Google Sheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/config/:brandId', sheetsController.saveConfig);

/**
 * @swagger
 * /api/v1/sheets/sync/{brandId}:
 *   post:
 *     summary: Trigger manual bi-directional sync for a brand sheet
 *     tags: [Google Sheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sync/:brandId', sheetsController.syncSheet);

export default router;
