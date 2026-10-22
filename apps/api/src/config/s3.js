import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

/**
 * AWS S3 / MinIO Client instance.
 */
export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

export default s3Client;
