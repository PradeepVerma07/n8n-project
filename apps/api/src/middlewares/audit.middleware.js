import { prisma } from '../config/prisma.js';

/**
 * Creates an asynchronous audit log entry in PostgreSQL.
 * Non-blocking: errors during audit logging do not fail the request.
 *
 * @param {object} params
 * @param {string} params.orgId
 * @param {string} [params.userId]
 * @param {string} params.action - e.g. 'CREATE_POST', 'ENQUEUE_PUBLISH', 'SYNC_SHEETS'
 * @param {string} params.entityType - e.g. 'POST', 'BRAND', 'SHEET'
 * @param {string} [params.entityId]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {any} [params.beforeState]
 * @param {any} [params.afterState]
 */
export async function recordAuditLog({
  orgId,
  userId,
  action,
  entityType,
  entityId,
  ipAddress,
  userAgent,
  beforeState,
  afterState,
}) {
  if (!orgId || !action || !entityType) {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: userId || null,
        action,
        entityType,
        entityId: String(entityId || 'N/A'),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
        afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : null,
      },
    });
  } catch (err) {
    // Audit log failures must never crash request handling
    console.warn(`[AuditLogger] Failed to write audit record: ${err.message}`);
  }
}

/**
 * Helper middleware that intercepts response finish event to record an audit log.
 *
 * @param {string} action
 * @param {string} entityType
 * @param {Function} [getEntityId] - Extractor function (req, res) => entityId
 */
export function auditAction(action, entityType, getEntityId) {
  return (req, res, next) => {
    res.on('finish', () => {
      // Only audit successful state-changing mutations (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = getEntityId ? getEntityId(req, res) : req.params?.id || req.body?.id;
        recordAuditLog({
          orgId: req.orgId || req.user?.orgId,
          userId: req.user?.id,
          action,
          entityType,
          entityId,
          ipAddress: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent'],
          afterState: req.body,
        });
      }
    });

    next();
  };
}
