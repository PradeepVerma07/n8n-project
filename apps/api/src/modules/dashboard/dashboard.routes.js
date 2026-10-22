import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';
import { dashboardController } from './dashboard.controller.js';

const router = Router();

// All dashboard endpoints require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

router.get('/metrics', dashboardController.getMetrics);
router.get('/attention-summary', dashboardController.getAttentionSummary);
router.get('/upcoming', dashboardController.getUpcoming);
router.get('/recent-activity', dashboardController.getRecentActivity);
router.get('/connections-health', dashboardController.getConnectionsHealth);

export default router;
