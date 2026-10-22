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
