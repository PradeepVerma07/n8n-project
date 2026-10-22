import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';
import { mediaController } from './media.controller.js';

const router = Router();

// Configure Multer for memory buffer storage with 500MB max limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

router.use(authenticate, requireTenant);

/**
 * @swagger
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload and process media file
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded and processed
 */
router.post('/upload', upload.single('file'), mediaController.uploadFile);

/**
 * @swagger
 * /api/v1/media/presigned-url:
 *   post:
 *     summary: Get S3 presigned URL for direct client upload
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post('/presigned-url', mediaController.getPresignedUrl);

/**
 * @swagger
 * /api/v1/media/confirm-upload:
 *   post:
 *     summary: Confirm direct S3 upload and register media asset
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post('/confirm-upload', mediaController.confirmUpload);

/**
 * @swagger
 * /api/v1/media:
 *   get:
 *     summary: List media assets with pagination and filters
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', mediaController.listMedia);

/**
 * @swagger
 * /api/v1/media/{id}:
 *   get:
 *     summary: Get media asset details
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', mediaController.getMediaById);

/**
 * @swagger
 * /api/v1/media/{id}:
 *   delete:
 *     summary: Delete media asset
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', mediaController.deleteMedia);

/**
 * @swagger
 * /api/v1/media/validate:
 *   post:
 *     summary: Validate media against platform specifications
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post('/validate', mediaController.validateMedia);

export default router;
