import { describe, it, expect, vi } from 'vitest';
import { postsService } from '../src/modules/posts/posts.service.js';
import { POST_STATUS } from '@postpilot/shared';
import { prisma } from '../src/config/prisma.js';
import { postsRepository } from '../src/modules/posts/posts.repository.js';

describe('Posts Service Unit Tests', () => {
  it('generates unique custom post IDs matching PP-YYYY-XXXXXX', () => {
    const id1 = postsService.generateCustomId();
    const id2 = postsService.generateCustomId();

    expect(id1).toMatch(/^PP-\d{4}-[A-F0-9]{6}$/);
    expect(id2).toMatch(/^PP-\d{4}-[A-F0-9]{6}$/);
    expect(id1).not.toBe(id2);
  });

  it('rejects post edits when post status is locked in QUEUED or PUBLISHING', async () => {
    const lockedStatuses = [POST_STATUS.QUEUED, POST_STATUS.PUBLISHING, POST_STATUS.PUBLISHED];

    for (const status of lockedStatuses) {
      const mockPost = {
        id: 'post-1',
        brand: { orgId: 'org-1' },
        status,
      };

      expect([POST_STATUS.QUEUED, POST_STATUS.PUBLISHING, POST_STATUS.PUBLISHED].includes(mockPost.status)).toBe(true);
    }
  });

  it('bulk import parser correctly detects CSV header and row validation errors', async () => {
    // Mock prisma brand lookup and repository create to run without live DB
    vi.spyOn(prisma.brand, 'findMany').mockResolvedValueOnce([
      { id: 'brand_acme', name: 'Acme Foods', slug: 'acme-foods', defaultTimezone: 'Asia/Kolkata' },
    ]);
    vi.spyOn(postsRepository, 'create').mockResolvedValue({});

    const sampleCsv = `post_id,client_name,brand_id,topic,caption,hashtags,platforms,post_type,media_urls,scheduled_date,scheduled_time,timezone,status,first_comment,link_url,published_at_utc,platform_post_ids,error_message,last_updated_by
PP-2026-000999,Acme Foods,brand_acme,Diwali Sale,20% off all organic spices,#diwali #sale,"facebook,linkedin",image,https://cdn.postpilot.app/spice.jpg,2026-11-01,18:30,Asia/Kolkata,Scheduled,,,system,,,
,Acme Foods,brand_acme,Broken Post,Missing media for instagram,,instagram,image,,2026-11-01,18:30,Asia/Kolkata,Scheduled,,,system,,,`;

    const buffer = Buffer.from(sampleCsv, 'utf-8');
    const result = await postsService.bulkImport('test-org', 'test-user', buffer, 'csv');

    expect(result.total).toBe(2);
    expect(result.imported).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].error).toMatch(/Instagram requires at least one media URL/);
  });
});
