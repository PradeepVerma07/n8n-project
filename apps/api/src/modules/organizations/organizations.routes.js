import { Router } from 'express';
import { ROLES } from '@postpilot/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';
import { organizationsController } from './organizations.controller.js';

const router = Router();

router.use(authenticate, requireTenant);

/**
 * @swagger
 * /api/v1/organizations/me:
 *   get:
 *     summary: Get details of the active organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', organizationsController.getMyOrganization);

/**
 * @swagger
 * /api/v1/organizations/members:
 *   get:
 *     summary: Get all members / employees of the active organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/members', organizationsController.getMembers);

/**
 * @swagger
 * /api/v1/organizations/me:
 *   patch:
 *     summary: Update active organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/me',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN),
  organizationsController.updateMyOrganization
);

/**
 * @swagger
 * /api/v1/organizations/members/{userId}/role:
 *   patch:
 *     summary: Update role of an organization member
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/members/:userId/role',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN),
  organizationsController.updateMemberRole
);

/**
 * @swagger
 * /api/v1/organizations/members/{userId}:
 *   patch:
 *     summary: Update an employee / member details and role
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/members/:userId',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN),
  organizationsController.updateMember
);

/**
 * @swagger
 * /api/v1/organizations/members:
 *   post:
 *     summary: Add an employee / member to organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/members',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN),
  organizationsController.createMember
);

/**
 * @swagger
 * /api/v1/organizations/members/{userId}:
 *   delete:
 *     summary: Remove member from organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/members/:userId',
  requireRoles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN),
  organizationsController.removeMember
);

export default router;
