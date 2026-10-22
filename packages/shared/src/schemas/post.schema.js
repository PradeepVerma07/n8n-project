import { z } from 'zod';
import { PLATFORMS } from '../constants/platforms.js';
import { POST_TYPES, POST_STATUS } from '../constants/post-status.js';
import { timezoneValidator } from './brand.schema.js';

export const platformOverrideSchema = z.object({
  platform: z.nativeEnum(PLATFORMS),
  captionOverride: z.string().optional().nullable(),
  firstCommentOverride: z.string().optional().nullable(),
});

export const createPostSchema = z.object({
  brandId: z.string().trim().min(1, 'Brand ID is required'),
  topic: z.string().trim().max(255).optional().nullable(),
  caption: z.string().default(''),
  hashtags: z.string().trim().max(1000).optional().nullable(),
  firstComment: z.string().trim().max(2000).optional().nullable(),
  linkUrl: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional().nullable(),
  postType: z.nativeEnum(POST_TYPES),
  mediaUrls: z.array(z.string()).default([]),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:mm (24-hour)'),
  timezone: timezoneValidator,
  platforms: z.array(platformOverrideSchema).min(1, 'Select at least one platform'),
  status: z.nativeEnum(POST_STATUS).default(POST_STATUS.DRAFT),
});

export const updatePostSchema = createPostSchema.partial();

export const approvePostSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().trim().max(500).optional(),
});
