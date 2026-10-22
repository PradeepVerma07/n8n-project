import { Router } from 'express';
import multer from 'multer';
import { createPostSchema, updatePostSchema, ROLES } from '@postpilot/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { postsController } from './posts.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(authenticate, requireTenant);

/**
 * @swagger
 * /api/v1/posts/calendar:
 *   get:
 *     summary: Get posts within date window for calendar
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/calendar', postsController.getCalendar);

/**
 * @swagger
 * /api/v1/posts/bulk-import:
 *   post:
 *     summary: Bulk import posts from CSV or XLSX matching sheet schema
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk-import', upload.single('file'), postsController.bulkImport);

/**
 * @swagger
 * /api/v1/posts:
 *   get:
 *     summary: List posts with pagination and filters
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', postsController.listPosts);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', postsController.getPostById);

/**
 * @swagger
 * /api/v1/posts:
 *   post:
 *     summary: Create new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', validate(createPostSchema), postsController.createPost);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   patch:
 *     summary: Update post (only while Draft or Scheduled)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', validate(updatePostSchema), postsController.updatePost);

/**
 * @swagger
 * /api/v1/posts/{id}/duplicate:
 *   post:
 *     summary: Duplicate post as new draft
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/duplicate', postsController.duplicatePost);

/**
 * @swagger
 * /api/v1/posts/{id}:
 *   delete:
 *     summary: Delete post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', postsController.deletePost);

/**
 * @swagger
 * /api/v1/posts/{id}/submit-approval:
 *   post:
 *     summary: Submit post for review
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/submit-approval', postsController.submitApproval);

/**
 * @swagger
 * /api/v1/posts/{id}/approve:
 *   post:
 *     summary: Approve post for publishing
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/approve',
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.AGENCY_ADMIN,
    ROLES.BRAND_MANAGER,
    ROLES.CLIENT_VIEWER
  ),
  postsController.approvePost
);

/**
 * @swagger
 * /api/v1/posts/{id}/reject:
 *   post:
 *     summary: Reject post and return to draft
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/reject',
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.AGENCY_ADMIN,
    ROLES.BRAND_MANAGER,
    ROLES.CLIENT_VIEWER
  ),
  postsController.rejectPost
);

export default router;
