import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { requireRoles, requireMinRole } from '../src/middlewares/rbac.middleware.js';
import { scopeToTenant } from '../src/middlewares/tenant.middleware.js';
import { ROLES } from '@postpilot/shared';

describe('API Health Probes', () => {
  it('GET /health returns 200 with UP status and uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /api/docs.json returns valid OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toMatch(/PostPilot API/);
  });

  it('GET /api/v1/nonexistent returns 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('NOT_FOUND');
  });
});

describe('Auth Endpoint Request Validations', () => {
  it('POST /api/v1/auth/login fails when body is empty', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/v1/auth/login fails with invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/register rejects weak passwords', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'weak', // Too short, no upper/number/symbol
      firstName: 'Test',
      lastName: 'User',
      organizationName: 'Test Org',
    });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });
});

describe('RBAC Middleware', () => {
  it('allows Super Admin unconditionally', () => {
    const req = { user: { role: ROLES.SUPER_ADMIN } };
    let nextCalled = false;
    const middleware = requireRoles(ROLES.CONTENT_CREATOR);
    middleware(req, {}, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it('allows matching role', () => {
    const req = { user: { role: ROLES.BRAND_MANAGER } };
    let nextCalled = false;
    const middleware = requireRoles(ROLES.BRAND_MANAGER, ROLES.AGENCY_ADMIN);
    middleware(req, {}, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it('blocks lower role with 403 AppError', () => {
    const req = { user: { role: ROLES.CLIENT_VIEWER } };
    let errorCaught;
    const middleware = requireRoles(ROLES.BRAND_MANAGER);
    middleware(req, {}, (err) => {
      errorCaught = err;
    });
    expect(errorCaught).toBeDefined();
    expect(errorCaught.statusCode).toBe(403);
    expect(errorCaught.errorCode).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
  });

  it('allows service accounts (n8n automation)', () => {
    const req = { isServiceAccount: true };
    let nextCalled = false;
    const middleware = requireRoles(ROLES.SUPER_ADMIN);
    middleware(req, {}, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it('correctly evaluates role hierarchy levels', () => {
    // CONTENT_CREATOR (level 20) attempting action requiring BRAND_MANAGER (level 30)
    const creatorReq = { user: { role: ROLES.CONTENT_CREATOR } };
    let err1;
    requireMinRole(ROLES.BRAND_MANAGER)(creatorReq, {}, (err) => {
      err1 = err;
    });
    expect(err1).toBeDefined();
    expect(err1.statusCode).toBe(403);

    // AGENCY_ADMIN (level 40) attempting action requiring BRAND_MANAGER (level 30)
    const adminReq = { user: { role: ROLES.AGENCY_ADMIN } };
    let nextCalled = false;
    requireMinRole(ROLES.BRAND_MANAGER)(adminReq, {}, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });
});

describe('Tenant Isolation Scoping', () => {
  it('correctly attaches orgId to query where filter', () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const scoped = scopeToTenant(orgId, { status: 'ACTIVE' });
    expect(scoped).toEqual({
      status: 'ACTIVE',
      orgId: '00000000-0000-0000-0000-000000000001',
    });
  });

  it('throws an error if attempting to scope without an orgId', () => {
    expect(() => scopeToTenant(null, {})).toThrow(/Cannot scope query without orgId/);
  });
});
