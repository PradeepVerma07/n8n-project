import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformAdapter } from '../src/adapters/base.adapter.js';
import { MockAdapter } from '../src/adapters/mock.adapter.js';
import { adapterRegistry } from '../src/adapters/registry.js';
import { webhookDispatcher } from '../src/services/webhook-dispatcher.service.js';
import { processPublishJob } from '../src/workers/publish.worker.js';
import { POST_STATUS, ERROR_CODES } from '@postpilot/shared';

describe('Phase 5: Publisher Service & Worker Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('PlatformAdapter Base Class Contract', () => {
    it('throws TypeError when attempting to instantiate abstract base class directly', () => {
      expect(() => new PlatformAdapter('FACEBOOK')).toThrow(TypeError);
    });

    it('formats caption with hashtags separated by clean newlines', () => {
      const adapter = new MockAdapter('FACEBOOK');
      const formatted = adapter.formatCaption({
        caption: '20% off all items today!',
        hashtags: '#sale #holiday',
      });

      expect(formatted).toBe('20% off all items today!\n\n#sale #holiday');
    });
  });

  describe('MockAdapter High-Fidelity Simulation', () => {
    it('generates platform-specific native IDs and public permalinks for all platforms', async () => {
      const platforms = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'PINTEREST'];

      for (const platform of platforms) {
        const adapter = new MockAdapter(platform, { simulatedDelayMs: 0 });
        const post = {
          caption: 'Great news everyone!',
          mediaUrls: ['https://cdn.example.com/image.jpg'],
        };

        const res = await adapter.publish(post);

        expect(res.success).toBe(true);
        expect(res.platformPostId).toBeDefined();
        expect(res.platformPostUrl).toMatch(new RegExp(`https://.*${platform.toLowerCase() === 'twitter' ? 'x' : platform.toLowerCase()}`));
      }
    });

    it('validates Instagram requirements: fails if no media URL is attached', () => {
      const igAdapter = new MockAdapter('INSTAGRAM');
      const invalidPost = { caption: 'Text only post for Instagram', mediaUrls: [] };
      const validation = igAdapter.validate(invalidPost);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toMatch(/requires at least 1 image or video asset/i);
    });

    it('handles controlled error injection tags for end-to-end retry verification', async () => {
      const adapter = new MockAdapter('FACEBOOK', { simulatedDelayMs: 0 });

      // Auth error injection
      await expect(
        adapter.publish({ caption: 'New post [FAIL_AUTH]' })
      ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_EXPIRED });

      // Rate limit error injection
      await expect(
        adapter.publish({ caption: 'New post [FAIL_RATE_LIMIT]' })
      ).rejects.toMatchObject({ code: ERROR_CODES.RATE_LIMITED });

      // Media error injection
      await expect(
        adapter.publish({ caption: 'New post [FAIL_MEDIA]' })
      ).rejects.toMatchObject({ code: ERROR_CODES.MEDIA_INVALID });

      // Server error injection
      await expect(
        adapter.publish({ caption: 'New post [FAIL_SERVER]' })
      ).rejects.toMatchObject({ code: ERROR_CODES.PLATFORM_ERROR });
    });
  });

  describe('AdapterRegistry', () => {
    it('returns initialized adapter for requested platform', () => {
      const fbAdapter = adapterRegistry.getAdapter('FACEBOOK');
      expect(fbAdapter).toBeInstanceOf(PlatformAdapter);
      expect(fbAdapter.getPlatformName()).toBe('FACEBOOK');

      const liAdapter = adapterRegistry.getAdapter('LINKEDIN');
      expect(liAdapter.getPlatformName()).toBe('LINKEDIN');
    });
  });

  describe('Webhook Dispatcher Service', () => {
    it('signs callback payload with HMAC-SHA256 and sets timestamp header', async () => {
      const payload = {
        postId: 'post-123',
        status: 'SUCCESS',
        platform: 'FACEBOOK',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      });

      const res = await webhookDispatcher.dispatchPublishResult(payload);

      expect(fetchSpy).toHaveBeenCalled();
      const firstCallHeaders = fetchSpy.mock.calls[0][1].headers;
      expect(firstCallHeaders['x-postpilot-signature']).toBeDefined();
      expect(firstCallHeaders['x-postpilot-timestamp']).toBeDefined();
      expect(res.apiDispatched).toBe(true);
    });
  });

  describe('Publish Worker Processor (BullMQ Job Lifecycle)', () => {
    it('executes publish job, updates Postgres records, writes Report row, and releases lock', async () => {
      const mockPost = {
        id: 'post-uuid-1',
        customId: 'PP-2026-000101',
        brandId: 'brand-1',
        scheduledLocal: new Date('2026-11-01T18:30:00Z'),
        scheduledUtc: new Date('2026-11-01T13:00:00Z'),
        timezone: 'Asia/Kolkata',
        postType: 'IMAGE',
        caption: 'Diwali Festive Sale!',
        mediaUrls: ['https://cdn.example.com/asset.jpg'],
        brand: {
          sheetConfig: {
            scheduleSpreadsheetId: 'sheet-123',
            scheduleSheetName: 'Schedule',
          },
        },
        platforms: [{ platform: 'FACEBOOK', status: 'PENDING' }],
      };

      const mockDb = {
        post: {
          findUnique: vi.fn().mockResolvedValue(mockPost),
          update: vi.fn().mockResolvedValue({}),
        },
        postPlatform: {
          findUnique: vi.fn().mockResolvedValue({ status: 'PENDING' }),
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([{ platform: 'FACEBOOK', status: 'PUBLISHED' }]),
        },
        publishJob: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        report: {
          create: vi.fn().mockResolvedValue({ id: 'report-1' }),
        },
      };

      const mockRedis = {
        set: vi.fn().mockResolvedValue('OK'), // Lock acquired
        get: vi.fn().mockResolvedValue('worker-123'),
        del: vi.fn().mockResolvedValue(1),
      };

      const mockDispatcher = {
        dispatchPublishResult: vi.fn().mockResolvedValue({ n8nDispatched: true, apiDispatched: true }),
      };

      const job = {
        id: 'job-1',
        data: {
          idempotencyKey: 'PP-2026-000101:FACEBOOK',
          postId: 'post-uuid-1',
          platform: 'FACEBOOK',
        },
        attemptsMade: 0,
        opts: { attempts: 5 },
      };

      const result = await processPublishJob(job, {
        prisma: mockDb,
        redis: mockRedis,
        webhookDispatcher: mockDispatcher,
      });

      expect(result.success).toBe(true);
      expect(result.overallStatus).toBe(POST_STATUS.PUBLISHED);
      expect(mockDb.postPlatform.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PUBLISHED',
          }),
        })
      );
      expect(mockDb.report.create).toHaveBeenCalled();
      expect(mockDispatcher.dispatchPublishResult).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
          platform: 'FACEBOOK',
        })
      );
      // Verify Redis lock released
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('enforces strict idempotency: skips execution if platform is already PUBLISHED', async () => {
      const mockDb = {
        post: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'post-uuid-1',
            brand: {},
            platforms: [{ platform: 'FACEBOOK', status: 'PUBLISHED' }],
          }),
        },
        postPlatform: {
          findUnique: vi.fn().mockResolvedValue({ status: 'PUBLISHED' }),
        },
      };

      const mockRedis = {
        set: vi.fn().mockResolvedValue('OK'),
        get: vi.fn().mockResolvedValue('worker-123'),
        del: vi.fn().mockResolvedValue(1),
      };

      const job = {
        id: 'job-1',
        data: {
          idempotencyKey: 'PP-2026-000101:FACEBOOK',
          postId: 'post-uuid-1',
          platform: 'FACEBOOK',
        },
      };

      const result = await processPublishJob(job, {
        prisma: mockDb,
        redis: mockRedis,
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/already been successfully published/i);
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
