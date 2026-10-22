import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { reportsService } from '../src/modules/reports/reports.service.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

describe('Phase 7: Reports & Analytics Module Tests', () => {
  let authToken;

  beforeEach(() => {
    vi.restoreAllMocks();
    authToken = jwt.sign(
      {
        userId: 'user-123',
        orgId: 'org-456',
        role: 'AGENCY_ADMIN',
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-123',
      email: 'admin@postpilot.app',
      isActive: true,
      memberships: [
        {
          orgId: 'org-456',
          role: 'AGENCY_ADMIN',
          organization: { id: 'org-456', name: 'Test Org', slug: 'test-org' },
        },
      ],
    });
  });

  describe('reportsService.getMetrics Aggregation', () => {
    it('aggregates total counts, success rate, and platform breakdowns accurately', async () => {
      const mockReports = [
        {
          id: 'rep-1',
          customId: 'PP-2026-0001',
          platform: 'FACEBOOK',
          status: 'SUCCESS',
          latencySeconds: 2.5,
          createdAt: new Date('2026-11-01T10:00:00Z'),
          errorCode: null,
        },
        {
          id: 'rep-2',
          customId: 'PP-2026-0002',
          platform: 'INSTAGRAM',
          status: 'SUCCESS',
          latencySeconds: 1.5,
          createdAt: new Date('2026-11-01T11:00:00Z'),
          errorCode: null,
        },
        {
          id: 'rep-3',
          customId: 'PP-2026-0003',
          platform: 'FACEBOOK',
          status: 'FAILED',
          latencySeconds: 4.0,
          createdAt: new Date('2026-11-02T09:00:00Z'),
          errorCode: 'RATE_LIMITED',
        },
      ];

      vi.spyOn(prisma.report, 'findMany').mockResolvedValue(mockReports);

      const metrics = await reportsService.getMetrics({
        orgId: 'org-456',
        days: 30,
      });

      expect(metrics.kpis.totalPublications).toBe(3);
      expect(metrics.kpis.successCount).toBe(2);
      expect(metrics.kpis.failedCount).toBe(1);
      expect(metrics.kpis.successRate).toBe(66.7); // 2/3 = 66.7%
      expect(metrics.kpis.avgLatencySeconds).toBe(2.7); // (2.5 + 1.5 + 4) / 3 = 2.67 -> 2.7s

      // Time-series breakdown
      expect(metrics.timeSeries.length).toBe(2); // Nov 1 and Nov 2
      expect(metrics.timeSeries[0].date).toBe('2026-11-01');
      expect(metrics.timeSeries[0].success).toBe(2);

      // Platform breakdown
      expect(metrics.platformBreakdown.length).toBe(2);
      const fb = metrics.platformBreakdown.find((p) => p.platform === 'FACEBOOK');
      expect(fb.total).toBe(2);
      expect(fb.success).toBe(1);
      expect(fb.failed).toBe(1);

      // Error code breakdown
      expect(metrics.errorBreakdown.length).toBe(1);
      expect(metrics.errorBreakdown[0].name).toBe('RATE_LIMITED');
      expect(metrics.errorBreakdown[0].count).toBe(1);
    });
  });

  describe('CSV & XLSX Export Generation', () => {
    it('generates CSV string matching the 19-column Google Sheets Report Sheet contract', async () => {
      const mockReports = [
        {
          id: 'rep-uuid-1',
          customId: 'PP-2026-000101',
          brandId: 'brand-acme',
          clientName: 'Acme Foods',
          topic: 'Diwali Festive Sale',
          platform: 'FACEBOOK',
          postType: 'IMAGE',
          scheduledLocal: new Date('2026-11-01T18:30:00Z'),
          timezone: 'Asia/Kolkata',
          scheduledUtc: new Date('2026-11-01T13:00:00Z'),
          attemptedAtUtc: new Date('2026-11-01T13:00:05Z'),
          publishedAtUtc: new Date('2026-11-01T13:00:08Z'),
          status: 'SUCCESS',
          attempts: 1,
          platformPostId: 'fb_123456',
          platformPostUrl: 'https://facebook.com/posts/123456',
          errorCode: null,
          errorMessage: null,
          latencySeconds: 3.2,
        },
      ];

      vi.spyOn(prisma.report, 'findMany').mockResolvedValue(mockReports);

      const csv = await reportsService.exportCsv({ orgId: 'org-456' });

      expect(csv).toContain('report_id,post_id,brand_id,client_name,topic,platform');
      expect(csv).toContain('PP-2026-000101');
      expect(csv).toContain('Acme Foods');
      expect(csv).toContain('https://facebook.com/posts/123456');
    });

    it('generates multi-tab Excel (.xlsx) workbook with Report Records and Summary tabs', async () => {
      vi.spyOn(prisma.report, 'findMany').mockResolvedValue([
        {
          id: 'rep-uuid-1',
          customId: 'PP-2026-000101',
          brandId: 'brand-acme',
          clientName: 'Acme Foods',
          topic: 'Diwali Festive Sale',
          platform: 'FACEBOOK',
          postType: 'IMAGE',
          scheduledLocal: new Date('2026-11-01T18:30:00Z'),
          timezone: 'Asia/Kolkata',
          scheduledUtc: new Date('2026-11-01T13:00:00Z'),
          attemptedAtUtc: new Date('2026-11-01T13:00:05Z'),
          publishedAtUtc: new Date('2026-11-01T13:00:08Z'),
          status: 'SUCCESS',
          attempts: 1,
          platformPostId: 'fb_123456',
          platformPostUrl: 'https://facebook.com/posts/123456',
          errorCode: null,
          errorMessage: null,
          latencySeconds: 2.8,
        },
      ]);

      const buffer = await reportsService.exportXlsx({ orgId: 'org-456' });
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer) || buffer instanceof Uint8Array).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });

  describe('HTTP Endpoints Integration', () => {
    it('GET /api/v1/reports/metrics returns 200 with KPI data for authenticated user', async () => {
      vi.spyOn(prisma.report, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/reports/metrics?days=30')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', 'org-456');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis.successRate).toBe(100);
    });

    it('GET /api/v1/reports/logs returns paginated list of execution rows', async () => {
      vi.spyOn(prisma.report, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.report, 'findMany').mockResolvedValue([
        {
          id: 'rep-1',
          customId: 'PP-2026-0001',
          clientName: 'Acme',
          platform: 'FACEBOOK',
          status: 'SUCCESS',
        },
      ]);

      const res = await request(app)
        .get('/api/v1/reports/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', 'org-456');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('GET /api/v1/reports/export.csv streams CSV file with attachment header', async () => {
      vi.spyOn(prisma.report, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/reports/export.csv')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', 'org-456');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename=');
    });

    it('GET /api/v1/reports/export.xlsx streams Excel file with openxmlformats header', async () => {
      vi.spyOn(prisma.report, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/reports/export.xlsx')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', 'org-456');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });
  });
});
