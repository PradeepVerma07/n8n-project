import { z } from 'zod';
import { PLATFORMS, PLATFORM_NAMES } from '../constants/platforms.js';
import { POST_TYPES, POST_STATUS } from '../constants/post-status.js';
import { isValidTimezone } from './brand.schema.js';

const VALID_PLATFORMS_SET = new Set(Object.values(PLATFORMS).map((p) => p.toLowerCase()));
const VALID_TYPES_SET = new Set(Object.values(POST_TYPES).map((t) => t.toLowerCase()));
const VALID_STATUS_SET = new Set(Object.values(POST_STATUS).map((s) => s.toLowerCase()));

/**
 * Validates comma-separated platform list.
 * e.g. "facebook, instagram, linkedin"
 */
const platformCsvValidator = z
  .string()
  .min(1, 'At least one platform is required')
  .transform((val) =>
    val
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
  )
  .refine(
    (platforms) => platforms.length > 0 && platforms.every((p) => VALID_PLATFORMS_SET.has(p)),
    {
      message: `Invalid platform list. Allowed platforms: ${PLATFORM_NAMES.join(', ')}`,
    }
  );

/**
 * Validates comma-separated media URLs.
 */
const mediaUrlsCsvValidator = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || typeof val !== 'string' || !val.trim()) return [];
    return val
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
  })
  .refine(
    (urls) => urls.every((url) => url.startsWith('http://') || url.startsWith('https://')),
    {
      message: 'All media URLs must be valid HTTP/HTTPS URLs',
    }
  );

/**
 * Zod schema for 19-column Google Sheet Schedule Row contract.
 */
export const sheetRowSchema = z
  .object({
    post_id: z.string().trim().optional(), // If empty, system generates one
    client_name: z.string().trim().min(1, 'client_name is required'),
    brand_id: z.string().trim().min(1, 'brand_id is required'),
    topic: z.string().trim().optional().nullable(),
    caption: z.string().default(''),
    hashtags: z.string().trim().optional().nullable(),
    platforms: platformCsvValidator,
    post_type: z
      .string()
      .trim()
      .transform((val) => val.toLowerCase())
      .refine((val) => VALID_TYPES_SET.has(val), {
        message: 'Invalid post_type. Allowed: image, video, carousel, text, reel, short, story',
      }),
    media_urls: mediaUrlsCsvValidator,
    scheduled_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduled_date must be in YYYY-MM-DD format'),
    scheduled_time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'scheduled_time must be in HH:mm 24-hour format'),
    timezone: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine((val) => !val || isValidTimezone(val), {
        message: 'Invalid IANA timezone',
      }),
    status: z
      .string()
      .trim()
      .transform((val) => val.toLowerCase())
      .refine((val) => VALID_STATUS_SET.has(val), {
        message: 'Invalid status',
      }),
    first_comment: z.string().trim().optional().nullable(),
    link_url: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine((val) => !val || val.startsWith('http://') || val.startsWith('https://'), {
        message: 'link_url must start with http:// or https://',
      }),
    published_at_utc: z.string().optional().nullable(),
    platform_post_ids: z.string().optional().nullable(),
    error_message: z.string().optional().nullable(),
    last_updated_by: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Cross-field validation: Instagram requires media
    if (data.platforms.includes('instagram')) {
      const media = data.media_urls || [];
      if (media.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Instagram requires at least one media URL',
          path: ['media_urls'],
        });
      }
    }

    // Video/Reel/Short requires video media
    if (['video', 'reel', 'short'].includes(data.post_type)) {
      const media = data.media_urls || [];
      if (media.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${data.post_type.toUpperCase()} requires a video media URL`,
          path: ['media_urls'],
        });
      }
    }

    // Text type requires caption
    if (data.post_type === 'text' && (!data.caption || !data.caption.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Text post requires a caption',
        path: ['caption'],
      });
    }
  });
