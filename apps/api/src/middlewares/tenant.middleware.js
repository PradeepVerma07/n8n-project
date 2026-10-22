import { AppError } from './error.middleware.js';

/**
 * Ensures request has a valid organization context attached.
 * Rejects requests from non-members or unauthenticated actors.
 */
export function requireTenant(req, res, next) {
  // Service accounts with master key have global access or scoped via their key
  if (req.isServiceAccount && !req.orgId) {
    return next();
  }

  if (!req.orgId) {
    return next(new AppError('Organization context is required for this action', 400, 'TENANT_REQUIRED'));
  }

  next();
}

/**
 * Creates tenant-scoped query filters for repositories.
 * Enforces that all database operations automatically filter by org_id.
 *
 * @param {string} orgId - Organization ID
 * @param {object} [baseWhere={}] - Additional where conditions
 * @returns {object} Scoped where clause
 */
export function scopeToTenant(orgId, baseWhere = {}) {
  if (!orgId) {
    throw new AppError('Cannot scope query without orgId', 500, 'INTERNAL_TENANT_ERROR');
  }
  return {
    ...baseWhere,
    orgId,
  };
}
