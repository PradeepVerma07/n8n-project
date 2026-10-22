/**
 * User roles within organizations.
 * Frozen object for immutable reference across frontend and backend.
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  AGENCY_ADMIN: 'AGENCY_ADMIN',
  BRAND_MANAGER: 'BRAND_MANAGER',
  CONTENT_CREATOR: 'CONTENT_CREATOR',
  CLIENT_VIEWER: 'CLIENT_VIEWER',
});

/**
 * Role hierarchy for privilege escalation and inheritance checks.
 * Higher number indicates greater permissions.
 */
export const ROLE_HIERARCHY = Object.freeze({
  [ROLES.CLIENT_VIEWER]: 10,
  [ROLES.CONTENT_CREATOR]: 20,
  [ROLES.BRAND_MANAGER]: 30,
  [ROLES.AGENCY_ADMIN]: 40,
  [ROLES.SUPER_ADMIN]: 50,
});

/**
 * Granular enterprise permissions.
 */
export const PERMISSIONS = Object.freeze({
  POST_READ: 'post.read',
  POST_CREATE: 'post.create',
  POST_EDIT: 'post.edit',
  POST_APPROVE: 'post.approve',
  POST_PUBLISH: 'post.publish',
  POST_DELETE: 'post.delete',
  MEDIA_MANAGE: 'media.manage',
  REPORT_READ: 'report.read',
  REPORT_EXPORT: 'report.export',
  INTEGRATION_MANAGE: 'integration.manage',
  CREDENTIALS_MANAGE: 'credentials.manage',
  TEAM_INVITE: 'team.invite',
  TEAM_MANAGE: 'team.manage',
  BRAND_MANAGE: 'brand.manage',
  AUDIT_READ: 'audit.read',
  API_KEY_MANAGE: 'api_key.manage',
});

/**
 * Role to permissions mapping for strict enterprise RBAC.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.AGENCY_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.BRAND_MANAGER]: [
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_EDIT,
    PERMISSIONS.POST_APPROVE,
    PERMISSIONS.POST_PUBLISH,
    PERMISSIONS.POST_DELETE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.BRAND_MANAGE,
    PERMISSIONS.INTEGRATION_MANAGE,
  ],
  [ROLES.CONTENT_CREATOR]: [
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_EDIT,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.REPORT_READ,
  ],
  [ROLES.CLIENT_VIEWER]: [
    PERMISSIONS.POST_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_EXPORT,
  ],
});

/**
 * Helper to check if a role possesses a specific permission.
 *
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  if (role === ROLES.SUPER_ADMIN || role === ROLES.AGENCY_ADMIN) return true;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}
