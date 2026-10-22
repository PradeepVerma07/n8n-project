import { ROLES, ROLE_HIERARCHY } from '@postpilot/shared';
import { AppError } from './error.middleware.js';

/**
 * Ensures the authenticated user has one of the specified roles in the active organization.
 *
 * @param {string[]} allowedRoles
 * @returns {import('express').RequestHandler}
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    // Service accounts (like n8n) bypass RBAC if authenticated
    if (req.isServiceAccount) {
      return next();
    }

    if (!req.user || !req.user.role) {
      return next(new AppError('No organization membership active', 403, 'FORBIDDEN_NO_ROLE'));
    }

    // Super Admin has access to all actions
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
          403,
          'FORBIDDEN_INSUFFICIENT_ROLE'
        )
      );
    }

    next();
  };
}

/**
 * Ensures user has at least the minimum role level in the hierarchy.
 *
 * @param {string} minRole - Lowest role allowed
 * @returns {import('express').RequestHandler}
 */
export function requireMinRole(minRole) {
  const minLevel = ROLE_HIERARCHY[minRole] || 0;

  return (req, res, next) => {
    if (req.isServiceAccount) {
      return next();
    }

    if (!req.user || !req.user.role) {
      return next(new AppError('No organization membership active', 403, 'FORBIDDEN_NO_ROLE'));
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;

    if (userLevel < minLevel) {
      return next(
        new AppError(
          `Access denied. Requires minimum role: ${minRole}`,
          403,
          'FORBIDDEN_INSUFFICIENT_ROLE'
        )
      );
    }

    next();
  };
}
