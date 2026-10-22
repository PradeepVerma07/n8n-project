import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';
import { reportsController } from './reports.controller.js';

const router = Router();

router.use(authenticate, requireTenant);

/**
 * @swagger
 * /api/v1/reports/metrics:
 *   get:
 *     summary: Get aggregated KPI metrics, time-series, and breakdowns
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/metrics', reportsController.getMetrics);

/**
 * @swagger
 * /api/v1/reports/logs:
 *   get:
 *     summary: Get paginated publish attempt execution logs
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/logs', reportsController.getLogs);

/**
 * @swagger
 * /api/v1/reports/export.csv:
 *   get:
 *     summary: Export execution records matching Google Sheets Report Sheet contract as CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export.csv', reportsController.exportCsv);

/**
 * @swagger
 * /api/v1/reports/export.xlsx:
 *   get:
 *     summary: Export styled multi-tab Excel workbook with Raw Records and Summary tabs
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export.xlsx', reportsController.exportXlsx);

export default router;
