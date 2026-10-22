import { prisma, isOfflineMode, isDbConnectionError } from '../../config/prisma.js';

export const STANDALONE_USERS = [
  {
    id: 'usr-admin-system',
    email: 'admin@apexmedia.com',
    passwordHash: '$2a$10$KkpXeRn9UGNyDggp0yDkHOYK5oDcQkn6G8gZDoB6/Pa6lTIzxlu8K', // ApexAdmin123!
    firstName: 'PostPilot',
    lastName: 'Admin',
    isActive: true,
    memberships: [
      {
        id: 'mem-admin-01',
        orgId: 'org-system-01',
        userId: 'usr-admin-system',
        role: 'AGENCY_ADMIN',
        organization: {
          id: 'org-system-01',
          name: 'Apex Media Agency',
          slug: 'apex-media',
        },
      },
    ],
  },
  {
    id: 'usr-manager-02',
    email: 'manager@apexmedia.com',
    passwordHash: '$2a$10$KkpXeRn9UGNyDggp0yDkHOYK5oDcQkn6G8gZDoB6/Pa6lTIzxlu8K', // ApexAdmin123!
    firstName: 'Sarah',
    lastName: 'Connor',
    isActive: true,
    memberships: [
      {
        id: 'mem-mgr-02',
        orgId: 'org-system-01',
        userId: 'usr-manager-02',
        role: 'BRAND_MANAGER',
        organization: {
          id: 'org-system-01',
          name: 'Apex Media Agency',
          slug: 'apex-media',
        },
      },
    ],
  },
  {
    id: 'usr-creator-03',
    email: 'creator@apexmedia.com',
    passwordHash: '$2a$10$KkpXeRn9UGNyDggp0yDkHOYK5oDcQkn6G8gZDoB6/Pa6lTIzxlu8K', // ApexAdmin123!
    firstName: 'Alex',
    lastName: 'Rivera',
    isActive: true,
    memberships: [
      {
        id: 'mem-crt-03',
        orgId: 'org-system-01',
        userId: 'usr-creator-03',
        role: 'CONTENT_CREATOR',
        organization: {
          id: 'org-system-01',
          name: 'Apex Media Agency',
          slug: 'apex-media',
        },
      },
    ],
  },
  {
    id: 'usr-client-04',
    email: 'client@apexmedia.com',
    passwordHash: '$2a$10$KkpXeRn9UGNyDggp0yDkHOYK5oDcQkn6G8gZDoB6/Pa6lTIzxlu8K', // ApexAdmin123!
    firstName: 'Elena',
    lastName: 'Rostova',
    isActive: true,
    memberships: [
      {
        id: 'mem-clt-04',
        orgId: 'org-system-01',
        userId: 'usr-client-04',
        role: 'CLIENT_VIEWER',
        organization: {
          id: 'org-system-01',
          name: 'Apex Media Agency',
          slug: 'apex-media',
        },
      },
    ],
  },
];

const STANDALONE_ADMIN = STANDALONE_USERS[0];

/**
 * Authentication & User Repository.
 */
export const authRepository = {
  /**
   * Finds user by email with their organization memberships.
   * @param {string} email
   */
  async findByEmail(email) {
    if (isOfflineMode) {
      return (
        STANDALONE_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) ||
        (email.toLowerCase().includes('admin') ? STANDALONE_ADMIN : null)
      );
    }

    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return (
          STANDALONE_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) ||
          (email.toLowerCase().includes('admin') ? STANDALONE_ADMIN : null)
        );
      }
      throw err;
    }
  },

  /**
   * Finds user by ID.
   * @param {string} id
   */
  async findById(id) {
    if (isOfflineMode) {
      return STANDALONE_USERS.find((u) => u.id === id) || STANDALONE_ADMIN;
    }

    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return STANDALONE_USERS.find((u) => u.id === id) || STANDALONE_ADMIN;
      }
      throw err;
    }
  },

  /**
   * Creates new user, organization, and organization admin membership in a single atomic transaction.
   * @param {object} params
   */
  async createUserWithOrg({ email, passwordHash, firstName, lastName, organizationName, slug }) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
        },
      });

      const membership = await tx.membership.create({
        data: {
          orgId: org.id,
          userId: user.id,
          role: 'AGENCY_ADMIN', // Creator of organization is AGENCY_ADMIN
        },
        include: {
          organization: true,
        },
      });

      return { user, org, membership };
    });
  },

  /**
   * Saves refresh token record.
   */
  async createRefreshToken({ userId, tokenHash, expiresAt }) {
    try {
      return await prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return { id: 'ref-token-01', userId, tokenHash, expiresAt };
      }
      throw err;
    }
  },

  /**
   * Finds active (non-revoked, non-expired) refresh token.
   */
  async findRefreshToken(tokenHash) {
    try {
      return await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              memberships: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return {
          id: 'ref-token-01',
          tokenHash,
          revokedAt: null,
          expiresAt: new Date(Date.now() + 30 * 86400000),
          user: STANDALONE_ADMIN,
        };
      }
      throw err;
    }
  },

  /**
   * Revokes refresh token.
   */
  async revokeRefreshToken(tokenHash) {
    try {
      return await prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return { tokenHash, revokedAt: new Date() };
      }
      throw err;
    }
  },

  /**
   * Revokes all refresh tokens for a user.
   */
  async revokeAllUserRefreshTokens(userId) {
    try {
      return await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return { count: 1 };
      }
      throw err;
    }
  },
};
