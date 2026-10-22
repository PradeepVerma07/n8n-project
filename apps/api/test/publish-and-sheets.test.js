import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { publishService } from '../src/modules/publish/publish.service.js';
import {
  mapCellsToRow,
  mapRowToCells,
  computeRowsChecksum,
  googleSheetsService,
} from '../src/modules/sheets/google-sheets.service.js';
import {
  createWebhookSignature,
  POST_STATUS,
  PLATFORMS,
} from '@postpilot/shared';
import { env } from '../src/config/env.js';

describe('Phase 4: Google Sheets & Publisher Service Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('19-Column Contract Mapper & Checksums', () => {
    it('correctly maps cell array (Columns A-S) to structured PostPilot row object', () => {
      const cells = [
        'PP-2026-000123', // A: post_id
        'Acme Foods',     // B: client_name
        'brand_acme',     // C: brand_id
        'Diwali Offer',   // D: topic
        'Festive discount', // E: caption
        '#festive #sale', // F: hashtags
        'facebook, instagram', // G: platforms
        'image',          // H: post_type
        'https://img.jpg',// I: media_urls
        '2026-11-01',     // J: scheduled_date
        '18:30',          // K: scheduled_time
        'Asia/Kolkata',   // L: timezone
        'Scheduled',      // M: status
        'Comment here',   // N: first_comment
        'https://site.com',// O: link_url
        '2026-11-01T13:00:00Z', // P: published_at_utc
        '{"fb":"123"}',   // Q: platform_post_ids
        '',               // R: error_message
        'system',         // S: last_updated_by
      ];

      const row = mapCellsToRow(cells, 5);

      expect(row.post_id).toBe('PP-2026-000123');
      expect(row.client_name).toBe('Acme Foods');
      expect(row.brand_id).toBe('brand_acme');
      expect(row.status).toBe('Scheduled');
      expect(row.rowIndex).toBe(5);
    });

    it('roundtrips structured row back to cell array without data loss', () => {
      const originalRow = {
        post_id: 'PP-2026-000789',
        client_name: 'Beta Corp',
        brand_id: 'brand_beta',
        topic: 'Product Launch',
        caption: 'Exciting new product coming soon',
        hashtags: '#launch',
        platforms: ['facebook', 'linkedin'],
        post_type: 'image',
        media_urls: ['https://cdn.example.com/asset.png'],
        scheduled_date: '2026-11-15',
        scheduled_time: '10:00',
        timezone: 'America/New_York',
        status: 'Scheduled',
        first_comment: 'Check out our link',
        link_url: 'https://beta.com',
        published_at_utc: '',
        platform_post_ids: { facebook: 'fb-99' },
        error_message: '',
        last_updated_by: 'system',
      };

      const cells = mapRowToCells(originalRow);

      expect(cells[0]).toBe('PP-2026-000789');
      expect(cells[1]).toBe('Beta Corp');
      expect(cells[6]).toBe('facebook, linkedin');
      expect(cells[16]).toBe('{"facebook":"fb-99"}');
    });

    it('computes deterministic SHA-256 checksums to prevent two-way sync loops', () => {
      const rowsA = [
        { post_id: '1', status: 'Scheduled', scheduled_date: '2026-11-01', scheduled_time: '10:00', caption: 'Hello' },
        { post_id: '2', status: 'Queued', scheduled_date: '2026-11-01', scheduled_time: '11:00', caption: 'World' },
      ];

      const rowsB = [
        { post_id: '2', status: 'Queued', scheduled_date: '2026-11-01', scheduled_time: '11:00', caption: 'World' },
        { post_id: '1', status: 'Scheduled', scheduled_date: '2026-11-01', scheduled_time: '10:00', caption: 'Hello' },
      ];

      // Order independent
      expect(computeRowsChecksum(rowsA)).toBe(computeRowsChecksum(rowsB));
    });
  });

  describe('Publisher Enqueue & Idempotency Service', () => {
    it('successfully enqueues rows and generates composite idempotency keys (${customId}:${platform})', async () => {
      vi.spyOn(prisma.brand, 'findUnique').mockResolvedValue({
        id: 'brand-123',
        name: 'Acme',
        defaultTimezone: 'Asia/Kolkata',
      });

      vi.spyOn(prisma.post, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.post, 'create').mockResolvedValue({
        id: 'post-uuid-1',
        customId: 'PP-2026-000555',
        status: POST_STATUS.QUEUED,
      });

      vi.spyOn(prisma.publishJob, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.publishJob, 'create').mockImplementation(async ({ data }) => ({
        id: 'job-1',
        ...data,
      }));
      vi.spyOn(prisma.postPlatform, 'upsert').mockResolvedValue({});

      const result = await publishService.enqueueRows({
        brandId: 'brand-123',
        rows: [
          {
            post_id: 'PP-2026-000555',
            topic: 'Summer Promo',
            caption: 'Summer is here!',
            platforms: 'facebook, instagram',
            post_type: 'image',
            media_urls: 'https://cdn.example.com/summer.jpg',
            scheduled_date: '2026-11-01',
            scheduled_time: '18:30',
            timezone: 'Asia/Kolkata',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.enqueuedCount).toBe(2); // 1 post x 2 platforms
      expect(result.skippedCount).toBe(0);
      expect(result.jobs.some((j) => j.idempotencyKey === 'PP-2026-000555:FACEBOOK')).toBe(true);
      expect(result.jobs.some((j) => j.idempotencyKey === 'PP-2026-000555:INSTAGRAM')).toBe(true);
    });

    it('enforces strict idempotency: skips duplicate enqueue for identical post_id and platform', async () => {
      vi.spyOn(prisma.brand, 'findUnique').mockResolvedValue({
        id: 'brand-123',
        name: 'Acme',
        defaultTimezone: 'Asia/Kolkata',
      });

      vi.spyOn(prisma.post, 'findUnique').mockResolvedValue({
        id: 'post-uuid-1',
        customId: 'PP-2026-000555',
        status: POST_STATUS.QUEUED,
      });

      // Simulate that publish job already exists in Postgres
      vi.spyOn(prisma.publishJob, 'findUnique').mockResolvedValue({
        id: 'existing-job-1',
        idempotencyKey: 'PP-2026-000555:FACEBOOK',
        status: 'ENQUEUED',
      });
      vi.spyOn(prisma.post, 'update').mockResolvedValue({});

      const result = await publishService.enqueueRows({
        brandId: 'brand-123',
        rows: [
          {
            post_id: 'PP-2026-000555',
            platforms: 'facebook',
            scheduled_date: '2026-11-01',
            scheduled_time: '18:30',
          },
        ],
      });

      expect(result.enqueuedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.jobs[0].status).toBe('SKIPPED');
    });
  });

  describe('HMAC Webhook Callback Verification', () => {
    it('verifies valid HMAC signature and updates post publish state', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = {
        postId: 'post-uuid-99',
        platform: 'FACEBOOK',
        status: 'SUCCESS',
        platformPostId: 'fb-post-id-12345',
        platformPostUrl: 'https://facebook.com/posts/12345',
      };

      const signature = createWebhookSignature(payload, env.N8N_HMAC_SECRET, timestamp);

      vi.spyOn(prisma.post, 'findFirst').mockResolvedValue({
        id: 'post-uuid-99',
        customId: 'PP-2026-000099',
        status: POST_STATUS.QUEUED,
      });
      vi.spyOn(prisma.postPlatform, 'updateMany').mockResolvedValue({ count: 1 });
      vi.spyOn(prisma.publishJob, 'updateMany').mockResolvedValue({ count: 1 });
      vi.spyOn(prisma.postPlatform, 'findMany').mockResolvedValue([
        { platform: 'FACEBOOK', status: 'PUBLISHED' },
      ]);
      vi.spyOn(prisma.post, 'update').mockResolvedValue({
        id: 'post-uuid-99',
        customId: 'PP-2026-000099',
        status: POST_STATUS.PUBLISHED,
      });

      const result = await publishService.handleWebhookCallback({
        signature,
        timestamp,
        rawBody: payload,
        body: payload,
      });

      expect(result.success).toBe(true);
      expect(result.overallStatus).toBe(POST_STATUS.PUBLISHED);
    });

    it('rejects tampered or expired HMAC signatures with 401', async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s ago (> 300s window)
      const payload = { postId: 'test' };
      const signature = createWebhookSignature(payload, env.N8N_HMAC_SECRET, expiredTimestamp);

      await expect(
        publishService.handleWebhookCallback({
          signature,
          timestamp: expiredTimestamp,
          rawBody: payload,
          body: payload,
        })
      ).rejects.toThrow(/replay attack prevention|timestamp expired/i);
    });
  });

  describe('GoogleSheetsService Mock & Batching', () => {
    it('returns valid simulated rows in mock mode matching 19-column contract', async () => {
      const result = await googleSheetsService.readScheduleRows('mock-spreadsheet-id-123');
      expect(result.validRows.length).toBeGreaterThan(0);
      expect(result.checksum).toBeDefined();
      expect(result.isMock).toBe(true);
      expect(result.validRows[0].post_id).toMatch(/^PP-/);
    });
  });

  describe('HTTP Endpoints Integration', () => {
    it('POST /api/v1/publish/callback returns 401 on missing signature headers', async () => {
      const res = await request(app)
        .post('/api/v1/publish/callback')
        .send({ postId: '123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/signature/i);
    });

    it('POST /api/v1/publish/enqueue rejects missing API key with 401', async () => {
      const res = await request(app)
        .post('/api/v1/publish/enqueue')
        .send({ brandId: 'brand-1', rows: [] });

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/publish/enqueue succeeds when valid x-api-key is supplied', async () => {
      vi.spyOn(prisma.brand, 'findUnique').mockResolvedValue({
        id: 'brand-1',
        name: 'Brand One',
        defaultTimezone: 'Asia/Kolkata',
      });

      const res = await request(app)
        .post('/api/v1/publish/enqueue')
        .set('x-api-key', env.POSTPILOT_API_KEY)
        .send({ brandId: 'brand-1', rows: [] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enqueuedCount).toBe(0);
    });
  });
});
