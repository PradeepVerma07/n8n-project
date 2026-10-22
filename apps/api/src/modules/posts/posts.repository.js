import { prisma } from '../../config/prisma.js';
import { SEED_DEMO_POSTS } from './seed-demo-posts.js';

const inMemoryPosts = [...SEED_DEMO_POSTS];

let isOfflineMode = false;

function isDbConnectionError(err) {
  if (
    err?.name === 'PrismaClientInitializationError' ||
    err?.message?.includes("Can't reach database server") ||
    err?.message?.includes('database server is running') ||
    err?.code === 'P1001'
  ) {
    isOfflineMode = true;
    return true;
  }
  return isOfflineMode;
}

export const postsRepository = {
  /**
   * Creates a post and its associated per-platform rows atomically.
   *
   * @param {object} postData
   * @param {Array<object>} platformsData
   */
  async create(postData, platformsData = []) {
    if (isOfflineMode) {
      const post = {
        ...postData,
        id: postData.id || `post-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        brand: { id: postData.brandId, name: 'Apex Global Foods', defaultTimezone: 'America/New_York' },
        platforms: platformsData.map((p, idx) => ({
          id: `plat-${idx}-${Date.now()}`,
          platform: p.platform,
          captionOverride: p.captionOverride || null,
          status: 'PENDING',
        })),
      };
      inMemoryPosts.unshift(post);
      return post;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const post = await tx.post.create({
          data: postData,
        });

        if (platformsData.length > 0) {
          await tx.postPlatform.createMany({
            data: platformsData.map((p) => ({
              postId: post.id,
              platform: p.platform,
              captionOverride: p.captionOverride || null,
              firstCommentOverride: p.firstCommentOverride || null,
              status: 'PENDING',
            })),
          });
        }

        return tx.post.findUnique({
          where: { id: post.id },
          include: {
            brand: true,
            platforms: true,
            createdBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            approvedBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        });
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        const post = {
          ...postData,
          id: postData.id || `post-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          brand: { id: postData.brandId, name: 'Apex Global Foods', defaultTimezone: 'America/New_York' },
          platforms: platformsData.map((p, idx) => ({
            id: `plat-${idx}-${Date.now()}`,
            platform: p.platform,
            captionOverride: p.captionOverride || null,
            status: 'PENDING',
          })),
        };
        inMemoryPosts.unshift(post);
        return post;
      }
      throw err;
    }
  },

  /**
   * Retrieves paginated posts filtered by organization, brand, status, and dates.
   */
  async findAll(orgId, { brandId, status, startDate, endDate, search, page = 1, limit = 20 } = {}) {
    if (isOfflineMode) {
      let filtered = inMemoryPosts.filter((p) => (!brandId || p.brandId === brandId) && (!status || p.status === status));
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((p) => p.caption?.toLowerCase().includes(s) || p.topic?.toLowerCase().includes(s) || p.customId?.toLowerCase().includes(s));
      }
      return {
        items: filtered.slice((page - 1) * limit, page * limit),
        pagination: {
          total: filtered.length,
          page,
          limit,
          totalPages: Math.ceil(filtered.length / limit) || 1,
        },
      };
    }

    const skip = (page - 1) * limit;

    const where = {
      brand: {
        orgId,
        ...(brandId ? { id: brandId } : {}),
      },
      ...(status ? { status } : {}),
      ...(startDate || endDate
        ? {
            scheduledUtc: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { caption: { contains: search, mode: 'insensitive' } },
              { topic: { contains: search, mode: 'insensitive' } },
              { customId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    try {
      const [items, total] = await Promise.all([
        prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledUtc: 'desc' },
          include: {
            brand: {
              select: { id: true, name: true, defaultTimezone: true, primaryColor: true, logoUrl: true },
            },
            platforms: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            approvedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        }),
        prisma.post.count({ where }),
      ]);

      return {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      if (isDbConnectionError(err)) {
        return {
          items: inMemoryPosts,
          pagination: {
            total: inMemoryPosts.length,
            page,
            limit,
            totalPages: Math.ceil(inMemoryPosts.length / limit) || 1,
          },
        };
      }
      throw err;
    }
  },

  /**
   * Finds post by ID.
   */
  async findById(id) {
    if (isOfflineMode) {
      return inMemoryPosts.find((p) => p.id === id) || null;
    }

    try {
      return await prisma.post.findUnique({
        where: { id },
        include: {
          brand: true,
          platforms: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return inMemoryPosts.find((p) => p.id === id) || null;
      }
      throw err;
    }
  },

  /**
   * Finds post by custom human ID (e.g. PP-2026-000101).
   */
  async findByCustomId(customId) {
    if (isOfflineMode) {
      return inMemoryPosts.find((p) => p.customId === customId) || null;
    }

    try {
      return await prisma.post.findUnique({
        where: { customId },
        include: {
          brand: true,
          platforms: true,
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return inMemoryPosts.find((p) => p.customId === customId) || null;
      }
      throw err;
    }
  },

  /**
   * Queries all scheduled posts whose scheduled time is due (<= now).
   */
  async findDueScheduledPosts() {
    const now = new Date();
    if (isOfflineMode) {
      return inMemoryPosts.filter((p) => {
        if (p.status !== 'SCHEDULED' && p.status !== 'QUEUED') return false;
        if (p.scheduledUtc) {
          return new Date(p.scheduledUtc) <= now;
        }
        if (p.scheduledDate) {
          const dt = new Date(`${p.scheduledDate}T${p.scheduledTime || '00:00'}:00`);
          return dt <= now;
        }
        return false;
      });
    }

    try {
      return await prisma.post.findMany({
        where: {
          status: { in: ['SCHEDULED', 'QUEUED'] },
          scheduledUtc: { lte: now },
        },
        include: {
          brand: true,
          platforms: true,
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return inMemoryPosts.filter((p) => {
          if (p.status !== 'SCHEDULED' && p.status !== 'QUEUED') return false;
          if (p.scheduledUtc) {
            return new Date(p.scheduledUtc) <= now;
          }
          if (p.scheduledDate) {
            const dt = new Date(`${p.scheduledDate}T${p.scheduledTime || '00:00'}:00`);
            return dt <= now;
          }
          return false;
        });
      }
      throw err;
    }
  },

  /**
   * Finds posts within a date window for calendar rendering.
   */
  async findForCalendar(orgId, { brandId, startUtc, endUtc }) {
    if (isOfflineMode) {
      return inMemoryPosts.filter((p) => !brandId || p.brandId === brandId);
    }

    try {
      return await prisma.post.findMany({
        where: {
          brand: {
            orgId,
            ...(brandId ? { id: brandId } : {}),
          },
          scheduledUtc: {
            gte: new Date(startUtc),
            lte: new Date(endUtc),
          },
        },
        include: {
          brand: {
            select: { id: true, name: true, defaultTimezone: true, primaryColor: true },
          },
          platforms: true,
        },
        orderBy: { scheduledUtc: 'asc' },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return inMemoryPosts.filter((p) => !brandId || p.brandId === brandId);
      }
      throw err;
    }
  },

  /**
   * Finds due posts for automated scheduling and n8n dispatch.
   */
  async findDuePosts(brandId) {
    const now = new Date();
    const isDue = (p) => (!brandId || p.brandId === brandId) && p.status === 'SCHEDULED' && (!p.scheduledUtc || new Date(p.scheduledUtc) <= now);
    if (isOfflineMode) {
      return inMemoryPosts.filter(isDue);
    }

    try {
      return await prisma.post.findMany({
        where: {
          brandId,
          status: 'SCHEDULED',
          scheduledUtc: { lte: now },
        },
        include: {
          platforms: true,
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return inMemoryPosts.filter(isDue);
      }
      throw err;
    }
  },

  /**
   * Updates post status and per-platform statuses.
   */
  async updateStatus(idOrCustomId, status, extraOrPlatformStatus = 'SUCCESS') {
    const platformStatus = typeof extraOrPlatformStatus === 'string' ? extraOrPlatformStatus : 'SUCCESS';
    const extraData = typeof extraOrPlatformStatus === 'object' && extraOrPlatformStatus !== null ? extraOrPlatformStatus : {};

    const post = inMemoryPosts.find((p) => p.id === idOrCustomId || p.customId === idOrCustomId);
    if (post) {
      post.status = status;
      post.updatedAt = new Date();
      if (status === 'PUBLISHED') {
        post.publishedAt = new Date();
      }
      if (post.platforms) {
        post.platforms.forEach((pl) => {
          pl.status = platformStatus;
        });
      }
      Object.assign(post, extraData);
    }

    try {
      const where = idOrCustomId && idOrCustomId.startsWith('PP-') ? { customId: idOrCustomId } : { id: idOrCustomId };
      return await prisma.post.update({
        where,
        data: {
          status,
          ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
          ...extraData,
        },
        include: {
          brand: true,
          platforms: true,
        },
      });
    } catch (err) {
      // In-memory post is already updated
      return post;
    }
  },

  /**
   * Updates post and replaces/updates platform records.
   */
  async update(id, postData, platformsData) {
    return prisma.$transaction(async (tx) => {
      const post = await tx.post.update({
        where: { id },
        data: postData,
      });

      if (platformsData) {
        // Delete old platforms and re-create to accommodate platform selection changes
        await tx.postPlatform.deleteMany({ where: { postId: id } });
        await tx.postPlatform.createMany({
          data: platformsData.map((p) => ({
            postId: id,
            platform: p.platform,
            captionOverride: p.captionOverride || null,
            firstCommentOverride: p.firstCommentOverride || null,
            status: 'PENDING',
          })),
        });
      }

      return tx.post.findUnique({
        where: { id },
        include: {
          brand: true,
          platforms: true,
        },
      });
    });
  },

  /**
   * Deletes a post.
   */
  async delete(id) {
    return prisma.post.delete({
      where: { id },
    });
  },
};
