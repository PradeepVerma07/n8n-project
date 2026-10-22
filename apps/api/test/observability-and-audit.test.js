import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { recordAuditLog } from '../src/middlewares/audit.middleware.js';

describe('Phase 8: Observability, Metrics & Production Hardening Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Prometheus Metrics & Health Endpoints', () => {
    it('GET /metrics returns 200 with Prometheus formatted metric declarations', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('postpilot_http_requests_total');
      expect(res.text).toContain('postpilot_publish_jobs_total');
    });

    it('GET /health returns 200 with UP status, uptime, and memory statistics', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.memory).toBeDefined();
      expect(res.body.memory.heapUsedMb).toBeGreaterThan(0);
    });

    it('GET /ready returns READY when database query succeeds', async () => {
      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ 1: 1 }]);

      const res = await request(app).get('/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.checks.database).toBe('UP');
    });

    it('GET /ready returns 503 NOT_READY when database query fails', async () => {
      vi.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('Connection refused'));

      const res = await request(app).get('/ready');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('NOT_READY');
      expect(res.body.checks.database).toBe('DOWN');
      expect(res.body.checks.error).toBe('Connection refused');
    });
  });

  describe('Centralized Audit Logging Middleware', () => {
    it('creates an audit log entry in PostgreSQL asynchronously', async () => {
      const createSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-1' });

      await recordAuditLog({
        orgId: 'org-123',
        userId: 'user-456',
        action: 'CREATE_POST',
        entityType: 'POST',
        entityId: 'PP-2026-0001',
        ipAddress: '127.0.0.1',
        userAgent: 'PostPilot-Agent',
        afterState: { caption: 'Audited post' },
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: 'org-123',
            userId: 'user-456',
            action: 'CREATE_POST',
            entityType: 'POST',
            entityId: 'PP-2026-0001',
          }),
        })
      );
    });

    it('gracefully handles database failure during audit logging without throwing', async () => {
      vi.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('DB lock conflict'));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Must not throw exception
      await expect(
        recordAuditLog({
          orgId: 'org-123',
          action: 'DELETE_BRAND',
          entityType: 'BRAND',
        })
      ).resolves.not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
