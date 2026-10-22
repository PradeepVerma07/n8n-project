import crypto from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import { s3Client } from '../../config/s3.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { validateMediaForPlatforms } from '@postpilot/shared';
import { mediaRepository } from './media.repository.js';

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime', // .mov
]);

export const mediaService = {
  /**
   * Sniffs file buffer to verify true MIME type regardless of provided extension.
   * @param {Buffer} buffer
   * @param {string} fallbackMime
   * @returns {Promise<{ mime: string, ext: string }>}
   */
  async sniffMimeType(buffer, fallbackMime) {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected) {
      if (ALLOWED_MIME_TYPES.has(fallbackMime)) {
        return { mime: fallbackMime, ext: fallbackMime.split('/')[1] };
      }
      throw new AppError('Unable to determine valid media file type', 400, 'MEDIA_UNSUPPORTED_TYPE');
    }

    if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new AppError(
        `Unsupported media type: ${detected.mime}. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV`,
        400,
        'MEDIA_UNSUPPORTED_TYPE'
      );
    }

    return detected;
  },

  /**
   * Processes an uploaded file buffer, generates thumbnails, uploads to S3, and records in DB.
   *
   * @param {string} orgId - Tenant organization ID
   * @param {object} file - Multer file object
   * @param {Buffer} file.buffer
   * @param {string} file.originalname
   * @param {string} file.mimetype
   * @param {number} file.size
   */
  async processAndUpload(orgId, file) {
    if (!file || !file.buffer) {
      throw new AppError('No file uploaded', 400, 'MEDIA_MISSING_FILE');
    }

    // 1. Sniff actual MIME type
    const { mime, ext } = await this.sniffMimeType(file.buffer, file.mimetype);

    // 2. Compute SHA-256 checksum
    const checksumSha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 3. Generate randomized storage keys
    const yearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const fileId = crypto.randomUUID();
    const s3Key = `org_${orgId}/${yearMonth}/${fileId}.${ext}`;

    let width = null;
    let height = null;
    let durationSeconds = null;
    let thumbnailUrl = null;
    let thumbnailKey = null;

    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    // 4. Extract metadata and generate thumbnail
    if (isImage) {
      try {
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;

        // Generate 320x320 WebP thumbnail
        const thumbBuffer = await sharp(file.buffer)
          .resize(320, 320, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toBuffer();

        thumbnailKey = `org_${orgId}/${yearMonth}/thumbs/${fileId}_thumb.webp`;

        // Upload thumbnail to S3
        await s3Client.send(
          new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: thumbnailKey,
            Body: thumbBuffer,
            ContentType: 'image/webp',
          })
        );

        thumbnailUrl = `${env.S3_PUBLIC_URL}/${thumbnailKey}`;
      } catch (err) {
        console.warn('Image processing warning:', err.message);
      }
    } else if (isVideo) {
      // For video, fallback thumbnail placeholder or extract if ffmpeg is available
      thumbnailUrl = `${env.API_URL}/placeholders/video-thumb.png`;
    }

    // 5. Upload original media file to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: mime,
      })
    );

    const publicUrl = `${env.S3_PUBLIC_URL}/${s3Key}`;

    // 6. Save media asset record in database
    const asset = await mediaRepository.create(orgId, {
      s3Key,
      publicUrl,
      originalFilename: file.originalname,
      mimeType: mime,
      fileSize: BigInt(file.size),
      checksumSha256,
      width,
      height,
      durationSeconds,
      thumbnailUrl,
      metadata: {
        extension: ext,
        thumbnailKey,
      },
    });

    return {
      ...asset,
      fileSize: Number(asset.fileSize),
    };
  },

  /**
   * Generates a pre-signed S3 PUT URL for direct large client-side uploads.
   *
   * @param {string} orgId
   * @param {object} params
   * @param {string} params.filename
   * @param {string} params.mimeType
   * @param {number} params.fileSize
   */
  async generatePresignedUploadUrl(orgId, { filename, mimeType, fileSize }) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new AppError(`Unsupported MIME type: ${mimeType}`, 400, 'MEDIA_UNSUPPORTED_TYPE');
    }

    const ext = filename.split('.').pop() || 'bin';
    const yearMonth = new Date().toISOString().slice(0, 7);
    const fileId = crypto.randomUUID();
    const s3Key = `org_${orgId}/${yearMonth}/${fileId}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    // 15-minute expiration
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const publicUrl = `${env.S3_PUBLIC_URL}/${s3Key}`;

    return {
      uploadUrl,
      s3Key,
      publicUrl,
      expiresInSeconds: 900,
    };
  },

  /**
   * Confirms a direct S3 upload and registers it in the database.
   *
   * @param {string} orgId
   * @param {object} data
   */
  async confirmDirectUpload(orgId, data) {
    const asset = await mediaRepository.create(orgId, {
      s3Key: data.s3Key,
      publicUrl: data.publicUrl || `${env.S3_PUBLIC_URL}/${data.s3Key}`,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      fileSize: BigInt(data.fileSize),
      checksumSha256: data.checksumSha256 || 'direct_upload',
      width: data.width || null,
      height: data.height || null,
      durationSeconds: data.durationSeconds || null,
      thumbnailUrl: data.thumbnailUrl || null,
    });

    return {
      ...asset,
      fileSize: Number(asset.fileSize),
    };
  },

  /**
   * Lists assets for organization.
   */
  async listMedia(orgId, query) {
    return mediaRepository.findAll(orgId, query);
  },

  /**
   * Gets details of a media asset and includes platform validation warnings.
   */
  async getMediaById(orgId, id, platforms = []) {
    const asset = await mediaRepository.findById(orgId, id);
    if (!asset) {
      throw new AppError('Media asset not found', 404, 'MEDIA_NOT_FOUND');
    }

    const platformValidation = platforms.length > 0
      ? validateMediaForPlatforms(asset, platforms)
      : null;

    return {
      ...asset,
      platformValidation,
    };
  },

  /**
   * Deletes a media asset from S3 and database.
   */
  async deleteMedia(orgId, id) {
    const asset = await mediaRepository.findById(orgId, id);
    if (!asset) {
      throw new AppError('Media asset not found', 404, 'MEDIA_NOT_FOUND');
    }

    // Attempt to delete from S3
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: asset.s3Key,
        })
      );

      const thumbKey = asset.metadata?.thumbnailKey;
      if (thumbKey) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: thumbKey,
          })
        );
      }
    } catch (err) {
      console.warn('Failed to delete S3 object (might already be deleted):', err.message);
    }

    await mediaRepository.delete(orgId, id);
    return { success: true };
  },

  /**
   * Validates media specifications for given platforms.
   */
  validateMediaSpecs(asset, platforms) {
    return validateMediaForPlatforms(asset, platforms);
  },
};
