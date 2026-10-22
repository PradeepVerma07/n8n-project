import { describe, it, expect } from 'vitest';
import { sheetRowSchema } from '../src/schemas/sheet-row.schema.js';

describe('Google Sheet Row Schema Validator (@postpilot/shared)', () => {
  const validRow = {
    post_id: 'PP-2026-000123',
    client_name: 'Acme Foods',
    brand_id: 'brand_acme_1',
    topic: 'Diwali Offer',
    caption: 'Celebrate with 20% off all spices!',
    hashtags: '#diwali #sale',
    platforms: 'facebook, instagram, linkedin',
    post_type: 'image',
    media_urls: 'https://cdn.postpilot.app/media/sample.jpg',
    scheduled_date: '2026-11-01',
    scheduled_time: '18:30',
    timezone: 'Asia/Kolkata',
    status: 'Scheduled',
    first_comment: 'Link in bio for discounts!',
    link_url: 'https://acmefoods.com/diwali',
    published_at_utc: null,
    platform_post_ids: null,
    error_message: null,
    last_updated_by: 'system',
  };

  it('validates a correct 19-column schedule row', () => {
    const parsed = sheetRowSchema.safeParse(validRow);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.platforms).toEqual(['facebook', 'instagram', 'linkedin']);
      expect(parsed.data.post_type).toBe('image');
      expect(parsed.data.media_urls).toEqual(['https://cdn.postpilot.app/media/sample.jpg']);
    }
  });

  it('fails if Instagram is selected without media', () => {
    const invalidRow = {
      ...validRow,
      platforms: 'instagram',
      post_type: 'text',
      media_urls: '',
    };
    const parsed = sheetRowSchema.safeParse(invalidRow);
    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].message).toMatch(/Instagram requires at least one media URL/);
  });

  it('fails if video post_type is selected without media', () => {
    const invalidRow = {
      ...validRow,
      platforms: 'facebook',
      post_type: 'video',
      media_urls: '',
    };
    const parsed = sheetRowSchema.safeParse(invalidRow);
    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].message).toMatch(/VIDEO requires a video media URL/);
  });

  it('fails with invalid IANA timezone', () => {
    const invalidRow = {
      ...validRow,
      timezone: 'Mars/Colony_1',
    };
    const parsed = sheetRowSchema.safeParse(invalidRow);
    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].message).toMatch(/Invalid IANA timezone/);
  });

  it('fails with invalid scheduled_date format', () => {
    const invalidRow = {
      ...validRow,
      scheduled_date: '01-11-2026', // DD-MM-YYYY instead of YYYY-MM-DD
    };
    const parsed = sheetRowSchema.safeParse(invalidRow);
    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].message).toMatch(/scheduled_date must be in YYYY-MM-DD format/);
  });
});
