import { z } from 'zod';
import { sheetRowSchema } from './sheet-row.schema.js';

export const enqueuePublishSchema = z.object({
  brandId: z.string().trim().min(1, 'brandId is required'),
  rows: z.array(sheetRowSchema).min(1, 'At least one row must be enqueued'),
});
