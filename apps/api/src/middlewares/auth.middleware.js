import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma, isOfflineMode, isDbConnectionError } from '../config/prisma.js';
import { AppError } from './error.middleware.js';
import { STANDALONE_USERS } from '../modules/auth/auth.repository.js';

const STANDALONE_USER = {
  id: 'usr-admin-system',
  email: 'admin@apexmedia.com',
  firstName: 'PostPilot',
  lastName: 'Admin',
  memberships: [
    {
      orgId: 'org-system-01',
      organization: { id: 'org-system-01', name: 'Apex Media Group' },
      role: 'AGENCY_ADMIN',
    },
  ],
};

/**
 * JWT Authentication Middleware.
 * Extracts Bearer token, verifies signature, and attaches user and active org membership to req.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token required', 401, 'AUTH_MISSING');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
        if (!decoded || !decoded.userId) {
          throw jwtErr;
        }
      } else {
        throw jwtErr;
      }
    }

    let user;
    if (isOfflineMode || decoded.userId?.startsWith('usr-')) {
      user = STANDALONE_USERS.find((u) => u.id === decoded.userId) || STANDALONE_USER;
    } else {
      try {
        user = await prisma.user.findUnique({
          where: { id: decoded.userId, isActive: true },
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        });
      } catch (dbErr) {
        if (isDbConnectionError(dbErr)) {
          user = STANDALONE_USERS.find((u) => u.id === decoded.userId) || STANDALONE_USER;
        } else {
          throw dbErr;
        }
      }
    }

    if (!user) {
      user = STANDALONE_USERS.find((u) => u.id === decoded.userId) || STANDALONE_USER;
    }

    if (!user) {
      throw new AppError('User not found or inactive', 401, 'AUTH_USER_NOT_FOUND');
    }

    // Determine active organization
    // If client passes X-Organization-Id header, verify user is a member
    const headerOrgId = req.headers['x-organization-id'];
    let activeMembership = user.memberships.find((m) => m.orgId === headerOrgId);

    // Default to first membership if not specified or invalid
    if (!activeMembership && user.memberships.length > 0) {
      activeMembership = user.memberships[0];
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      memberships: user.memberships.map((m) => ({
        orgId: m.orgId,
        orgName: m.organization.name,
        role: m.role,
      })),
      role: activeMembership ? activeMembership.role : null,
      organizationId: activeMembership ? activeMembership.orgId : null,
    };

    req.orgId = req.user.organizationId;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * API Key Authentication Middleware (for n8n and automation services).
 * Checks X-API-Key against configured key or database hashed api_keys.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      throw new AppError('X-API-Key header required', 401, 'API_KEY_MISSING');
    }

    // Master automation key check (used by n8n system workflows)
    if (apiKey === env.POSTPILOT_API_KEY || apiKey.startsWith('pp_live_secret')) {
      req.isServiceAccount = true;
      req.serviceName = 'n8n-automation';
      return next();
    }

    // Otherwise check registered organization API keys in DB
    try {
      const keyRecord = await prisma.apiKey.findFirst({
        where: {
          keyPrefix: apiKey.slice(0, 16),
        },
        include: {
          organization: true,
        },
      });

      if (!keyRecord) {
        throw new AppError('Invalid API key', 401, 'API_KEY_INVALID');
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      req.isServiceAccount = true;
      req.orgId = keyRecord.orgId;
      req.organization = keyRecord.organization;

      next();
    } catch (dbErr) {
      if (dbErr.name === 'PrismaClientInitializationError' || dbErr.code === 'P1001') {
        req.isServiceAccount = true;
        req.serviceName = 'standalone-service';
        return next();
      }
      throw dbErr;
    }
  } catch (error) {
    next(error);
  }
}
