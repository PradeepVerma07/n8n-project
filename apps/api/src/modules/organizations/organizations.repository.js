import { prisma, isOfflineMode, isDbConnectionError } from '../../config/prisma.js';
import { STANDALONE_USERS } from '../auth/auth.repository.js';

export const organizationsRepository = {
  async findById(orgId) {
    if (isOfflineMode) {
      return {
        id: orgId || 'org-system-01',
        name: 'Apex Media Agency',
        slug: 'apex-media',
        memberships: STANDALONE_USERS.map((u) => ({
          id: `mem-${u.id}`,
          orgId: orgId || 'org-system-01',
          userId: u.id,
          role: u.memberships?.[0]?.role || 'CONTENT_CREATOR',
          user: {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            avatarUrl: null,
            isActive: u.isActive !== false,
          },
        })),
        brands: [],
      };
    }

    try {
      return await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  isActive: true,
                },
              },
            },
          },
          brands: true,
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return {
          id: orgId || 'org-system-01',
          name: 'Apex Media Agency',
          slug: 'apex-media',
          memberships: STANDALONE_USERS.map((u) => ({
            id: `mem-${u.id}`,
            orgId: orgId || 'org-system-01',
            userId: u.id,
            role: u.memberships?.[0]?.role || 'CONTENT_CREATOR',
            user: {
              id: u.id,
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              avatarUrl: null,
              isActive: u.isActive !== false,
            },
          })),
          brands: [],
        };
      }
      throw err;
    }
  },

  async update(orgId, data) {
    if (isOfflineMode) return { id: orgId, ...data };
    try {
      return await prisma.organization.update({
        where: { id: orgId },
        data,
      });
    } catch (err) {
      if (isDbConnectionError(err)) return { id: orgId, ...data };
      throw err;
    }
  },

  async addMember(orgId, userId, role) {
    if (isOfflineMode) {
      const u = STANDALONE_USERS.find((user) => user.id === userId);
      if (u) {
        u.memberships = [{ id: `mem-${userId}`, orgId, userId, role }];
      }
      return { id: `mem-${userId}`, orgId, userId, role };
    }

    try {
      return await prisma.membership.create({
        data: {
          orgId,
          userId,
          role,
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return { id: `mem-${userId}`, orgId, userId, role };
      }
      throw err;
    }
  },

  async createEmployee(orgId, { email, firstName, lastName, role, password }) {
    const newUserId = `usr-${Date.now()}`;
    const newUser = {
      id: newUserId,
      email: email.toLowerCase(),
      firstName: firstName || 'Employee',
      lastName: lastName || 'Member',
      passwordHash: '$2a$10$KkpXeRn9UGNyDggp0yDkHOYK5oDcQkn6G8gZDoB6/Pa6lTIzxlu8K', // ApexAdmin123! or custom
      isActive: true,
      memberships: [
        {
          id: `mem-${newUserId}`,
          orgId: orgId || 'org-system-01',
          userId: newUserId,
          role: role || 'CONTENT_CREATOR',
          organization: { id: orgId || 'org-system-01', name: 'Apex Media Agency', slug: 'apex-media' },
        },
      ],
    };

    STANDALONE_USERS.push(newUser);
    return {
      id: `mem-${newUserId}`,
      orgId: orgId || 'org-system-01',
      userId: newUserId,
      role: role || 'CONTENT_CREATOR',
      user: {
        id: newUserId,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isActive: true,
      },
    };
  },

  async removeMember(orgId, userId) {
    const idx = STANDALONE_USERS.findIndex((u) => u.id === userId);
    if (idx !== -1 && STANDALONE_USERS.length > 1) {
      STANDALONE_USERS.splice(idx, 1);
    }

    if (isOfflineMode) return { count: 1 };

    try {
      return await prisma.membership.delete({
        where: {
          orgId_userId: {
            orgId,
            userId,
          },
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) return { count: 1 };
      throw err;
    }
  },

  async updateMemberRole(orgId, userId, role) {
    return this.updateMember(orgId, userId, { role });
  },

  async updateMember(orgId, userId, data) {
    const { role, firstName, lastName, email, isActive } = data;
    const user = STANDALONE_USERS.find((u) => u.id === userId);
    if (user) {
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (email !== undefined) user.email = email.toLowerCase();
      if (isActive !== undefined) user.isActive = isActive;
      if (role && user.memberships?.[0]) {
        user.memberships[0].role = role;
      }
    }

    if (isOfflineMode) {
      return { orgId, userId, role, user };
    }

    try {
      if (role) {
        await prisma.membership.update({
          where: {
            orgId_userId: {
              orgId,
              userId,
            },
          },
          data: { role },
        });
      }

      if (firstName || lastName || email || isActive !== undefined) {
        const updateUserData = {};
        if (firstName) updateUserData.firstName = firstName;
        if (lastName) updateUserData.lastName = lastName;
        if (email) updateUserData.email = email;
        if (isActive !== undefined) updateUserData.isActive = isActive;

        await prisma.user.update({
          where: { id: userId },
          data: updateUserData,
        });
      }

      return { orgId, userId, ...data };
    } catch (err) {
      if (isDbConnectionError(err)) {
        return { orgId, userId, ...data };
      }
      throw err;
    }
  },
};
