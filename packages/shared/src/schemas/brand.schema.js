import { z } from 'zod';
import { IANAZone } from 'luxon';

/**
 * Validates that a string is a valid IANA timezone identifier.
 * @param {string} val
 * @returns {boolean}
 */
export const isValidTimezone = (val) => {
  if (typeof val !== 'string' || !val.trim()) return false;
  return IANAZone.isValidZone(val.trim());
};

export const timezoneValidator = z
  .string()
  .trim()
  .refine(isValidTimezone, {
    message: 'Must be a valid IANA timezone (e.g., Asia/Kolkata, America/New_York)',
  });

export const createBrandSchema = z.object({
  name: z.string().trim().min(2, 'Brand name must be at least 2 characters').max(255),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  logoUrl: z.string().url('Must be a valid URL').optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color (e.g. #3B82F6)')
    .optional()
    .nullable(),
  defaultTimezone: timezoneValidator.default('Asia/Kolkata'),
  defaultHashtags: z.string().trim().max(1000).optional().nullable(),
  requiresApproval: z.boolean().default(false),
  autoPublishMissed: z.boolean().default(false),
  lookbackMinutes: z.number().int().min(1).max(1440).default(10),
  scheduleSpreadsheetId: z.string().trim().optional().nullable().or(z.literal('')),
  scheduleSheetName: z.string().trim().min(1).default('Schedule'),
  reportSpreadsheetId: z.string().trim().optional().nullable().or(z.literal('')),
  metaPageId: z.string().trim().optional().nullable().or(z.literal('')),
  metaIgAccountId: z.string().trim().optional().nullable().or(z.literal('')),
  metaAccessToken: z.string().trim().optional().nullable().or(z.literal('')),
  metaAppId: z.string().trim().optional().nullable().or(z.literal('')),
  linkedinOrgId: z.string().trim().optional().nullable().or(z.literal('')),
  twitterHandle: z.string().trim().optional().nullable().or(z.literal('')),
  youtubeChannelId: z.string().trim().optional().nullable().or(z.literal('')),
  tiktokAccountId: z.string().trim().optional().nullable().or(z.literal('')),
  pinterestBoardId: z.string().trim().optional().nullable().or(z.literal('')),
});

export const updateBrandSchema = createBrandSchema.partial();
