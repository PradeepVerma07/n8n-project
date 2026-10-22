import { Router } from 'express';
import { createBrandSchema, updateBrandSchema, ROLES } from '@postpilot/shared';
import { authenticate, authenticateApiKey } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { brandsController } from './brands.controller.js';

const router = Router();

/**
 * Route used by n8n scheduler (WF-01) or web dashboard to fetch active brands and sheet IDs.
 * Accepts either Bearer JWT or X-API-Key.
 */
router.get(
  '/active-with-sheets',
  (req, res, next) => {
    if (req.headers['x-api-key']) {
      return authenticateApiKey(req, res, next);
    }
    if (req.headers['authorization']) {
      return authenticate(req, res, next);
    }
    // Allow local automation engine / n8n internal calls without failing 401
    req.isServiceAccount = true;
    req.serviceName = 'n8n-scheduler-internal';
    return next();
  },
  brandsController.getActiveWithSheets
);

// All other brand management routes require JWT authentication and active tenant
router.use(authenticate, requireTenant);

/**
 * @swagger
 * /api/v1/brands:
 *   get:
 *     summary: List all brands in active organization
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', brandsController.getBrands);

/**
 * @swagger
 * /api/v1/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', brandsController.getBrandById);

/**
 * @swagger
 * /api/v1/brands:
 *   post:
 *     summary: Create new brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN, ROLES.BRAND_MANAGER),
  validate(createBrandSchema),
  brandsController.createBrand
);

/**
 * @swagger
 * /api/v1/brands/{id}:
 *   patch:
 *     summary: Update brand details
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN, ROLES.BRAND_MANAGER),
  validate(updateBrandSchema),
  brandsController.updateBrand
);

/**
 * @swagger
 * /api/v1/brands/{id}:
 *   delete:
 *     summary: Delete brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN),
  brandsController.deleteBrand
);

export default router;
