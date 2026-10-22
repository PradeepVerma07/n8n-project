/**
 * Post workflow and publication statuses.
 */
export const POST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  QUEUED: 'QUEUED',
  PUBLISHING: 'PUBLISHING',
  PUBLISHED: 'PUBLISHED',
  PARTIALLY_PUBLISHED: 'PARTIALLY_PUBLISHED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

/**
 * Per-platform publication statuses.
 */
export const PLATFORM_PUBLISH_STATUS = Object.freeze({
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  PUBLISHING: 'PUBLISHING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
});

/**
 * Post Types
 */
export const POST_TYPES = Object.freeze({
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  CAROUSEL: 'CAROUSEL',
  TEXT: 'TEXT',
  REEL: 'REEL',
  SHORT: 'SHORT',
  STORY: 'STORY',
});
