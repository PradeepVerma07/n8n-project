import { prisma, isOfflineMode, isDbConnectionError } from '../../config/prisma.js';
import { scopeToTenant } from '../../middlewares/tenant.middleware.js';

const STANDALONE_BRANDS = [
  {
    id: 'brd-system-01',
    orgId: 'org-system-01',
    name: 'Flower plant',
    slug: 'flower-plant',
    defaultTimezone: 'Asia/Kolkata',
    primaryColor: '#10b981',
    logoUrl: null,
    isActive: true,
    metaConfig: {
      metaPageId: '1454740611044963',
      metaIgAccountId: '17841439037630316',
      metaAccessToken: 'EAGVJejn6LZAgBS8IFTPqE8Is7gU0VNUpKTP00kWMvl1pWyTv02feZBUz1oeCsAjK2ZBVa3UabTfebO6qYN3lLQkOaOwdCkj6P2CHsf4ZCuawoH3ovQZC5lZCjOgeVep05egZBVUCceTA7cKJxM3SjSgNLNWRbATkThjbE5XYJnsVKZCZC9g8rxbt8gZBPZAEzTUPOxdZBKw2WqYFc2n771gm5b1QKfkUyhZA81SU5RMPp5CMwG50CgbRmYhUBjGEYXGkx4xJsdL2JAPHnaM4JgLWvtrAcCoZCi',
      metaAppId: '',
      status: 'CONNECTED',
    },
    sheetConfig: {
      scheduleSpreadsheetId: '11uZJdPucIlFoZbiFJdc6GHQZHL_11MlfNFEOu7sxRIw',
      scheduleSheetName: 'Schedule',
      reportSpreadsheetId: '',
      reportSheetPrefix: 'Report_',
    },
    socialAccounts: [
      {
        id: 'sa-fb-01',
        platform: 'FACEBOOK',
        accountName: 'Flower plant',
        accountHandle: '@flowerplant',
        platformAccountId: '1454740611044963',
        status: 'CONNECTED',
      },
      {
        id: 'sa-ig-01',
        platform: 'INSTAGRAM',
        accountName: 'Flower plant IG',
        accountHandle: '@flowerplant_ig',
        platformAccountId: '17841439037630316',
        status: 'CONNECTED',
      },
    ],
    _count: { posts: 20 },
  },
  {
    id: 'brd-flower-01',
    orgId: 'org-system-01',
    name: 'The Flower Plant',
    slug: 'the-flower-plant',
    defaultTimezone: 'Asia/Kolkata',
    primaryColor: '#059669',
    logoUrl: null,
    isActive: true,
    metaConfig: {
      metaPageId: '1454740611044963',
      metaIgAccountId: '17841439037630316',
      metaAccessToken: 'EAGVJejn6LZAgBS8IFTPqE8Is7gU0VNUpKTP00kWMvl1pWyTv02feZBUz1oeCsAjK2ZBVa3UabTfebO6qYN3lLQkOaOwdCkj6P2CHsf4ZCuawoH3ovQZC5lZCjOgeVep05egZBVUCceTA7cKJxM3SjSgNLNWRbATkThjbE5XYJnsVKZCZC9g8rxbt8gZBPZAEzTUPOxdZBKw2WqYFc2n771gm5b1QKfkUyhZA81SU5RMPp5CMwG50CgbRmYhUBjGEYXGkx4xJsdL2JAPHnaM4JgLWvtrAcCoZCi',
      metaAppId: '',
      status: 'CONNECTED',
    },
    sheetConfig: {
      scheduleSpreadsheetId: '11uZJdPucIlFoZbiFJdc6GHQZHL_11MlfNFEOu7sxRIw',
      scheduleSheetName: 'Schedule',
      reportSpreadsheetId: '',
      reportSheetPrefix: 'Report_',
    },
    socialAccounts: [
      {
        id: 'sa-fb-02',
        platform: 'FACEBOOK',
        accountName: 'Flower plant',
        accountHandle: '@flowerplant',
        platformAccountId: '1454740611044963',
        status: 'CONNECTED',
      },
      {
        id: 'sa-ig-02',
        platform: 'INSTAGRAM',
        accountName: 'Flower plant IG',
        accountHandle: '@flowerplant_ig',
        platformAccountId: '17841439037630316',
        status: 'CONNECTED',
      },
    ],
    _count: { posts: 20 },
  },
  {
    id: 'brd-system-02',
    orgId: 'org-system-01',
    name: 'Nova Tech Cloud',
    slug: 'nova-tech',
    defaultTimezone: 'America/Los_Angeles',
    primaryColor: '#0ea5e9',
    logoUrl: null,
    isActive: true,
    metaConfig: {
      metaPageId: '',
      metaIgAccountId: '',
      metaAccessToken: '',
      metaAppId: '',
      status: 'DISCONNECTED',
    },
    sheetConfig: {
      scheduleSpreadsheetId: '',
      scheduleSheetName: 'Schedule',
      reportSpreadsheetId: '',
      reportSheetPrefix: 'Report_',
    },
    socialAccounts: [],
    _count: { posts: 0 },
  },
];

export const brandsRepository = {
  /**
   * Lists all brands within the organization.
   * @param {string} orgId
   */
  async findAll(orgId) {
    try {
      return await prisma.brand.findMany({
        where: scopeToTenant(orgId),
        include: {
          sheetConfig: true,
          socialAccounts: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              accountHandle: true,
              avatarUrl: true,
              status: true,
              expiresAt: true,
            },
          },
          _count: {
            select: { posts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return STANDALONE_BRANDS;
      }
      throw err;
    }
  },

  /**
   * Finds all active brands that have a configured Google Sheet.
   * Can be globally queried by n8n or filtered by org.
   * @param {string} [orgId]
   */
  async findActiveWithSheets(orgId) {
    if (isOfflineMode) {
      return STANDALONE_BRANDS;
    }

    const where = {
      isActive: true,
      sheetConfig: {
        isNot: null,
      },
      ...(orgId ? { orgId } : {}),
    };

    try {
      return await prisma.brand.findMany({
        where,
        include: {
          sheetConfig: true,
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return STANDALONE_BRANDS;
      }
      throw err;
    }
  },

  /**
   * Finds brand by ID within tenant.
   * @param {string} orgId
   * @param {string} brandId
   */
  async findById(orgId, brandId) {
    try {
      const where = orgId ? scopeToTenant(orgId, { id: brandId }) : { id: brandId };
      return await prisma.brand.findFirst({
        where,
        include: {
          sheetConfig: true,
          socialAccounts: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              accountHandle: true,
              avatarUrl: true,
              status: true,
              expiresAt: true,
            },
          },
        },
      });
    } catch (err) {
      if (isDbConnectionError(err) || !orgId) {
        return STANDALONE_BRANDS.find((b) => b.id === brandId) || STANDALONE_BRANDS[0];
      }
      throw err;
    }
  },

  /**
   * Creates a brand and optionally its sheet configuration atomically.
   * @param {string} orgId
   * @param {object} data
   */
  async create(orgId, data) {
    const {
      scheduleSpreadsheetId,
      scheduleSheetName,
      reportSpreadsheetId,
      metaPageId,
      metaIgAccountId,
      metaAccessToken,
      metaAppId,
      linkedinOrgId,
      twitterHandle,
      youtubeChannelId,
      tiktokAccountId,
      pinterestBoardId,
      ...brandData
    } = data;

    const brandId = `brd-${Date.now()}`;
    const isMetaConnected = Boolean(metaAccessToken && (metaPageId || metaIgAccountId));
    const socialAccounts = [];
    if (metaPageId) {
      socialAccounts.push({
        id: `sa-fb-${Date.now()}`,
        platform: 'FACEBOOK',
        accountName: `${brandData.name} Page`,
        accountHandle: `@${brandData.slug || 'page'}`,
        platformAccountId: metaPageId,
        status: metaAccessToken ? 'CONNECTED' : 'DISCONNECTED',
      });
    }
    if (metaIgAccountId) {
      socialAccounts.push({
        id: `sa-ig-${Date.now()}`,
        platform: 'INSTAGRAM',
        accountName: `${brandData.name} IG`,
        accountHandle: `@${brandData.slug || 'ig'}`,
        platformAccountId: metaIgAccountId,
        status: metaAccessToken ? 'CONNECTED' : 'DISCONNECTED',
      });
    }
    if (linkedinOrgId) {
      socialAccounts.push({
        id: `sa-li-${Date.now()}`,
        platform: 'LINKEDIN',
        accountName: `${brandData.name} LinkedIn`,
        accountHandle: `@${brandData.slug || 'linkedin'}`,
        platformAccountId: linkedinOrgId,
        status: 'CONNECTED',
      });
    }
    if (twitterHandle) {
      socialAccounts.push({
        id: `sa-tw-${Date.now()}`,
        platform: 'TWITTER',
        accountName: `${brandData.name} X`,
        accountHandle: twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`,
        platformAccountId: twitterHandle,
        status: 'CONNECTED',
      });
    }
    if (youtubeChannelId) {
      socialAccounts.push({
        id: `sa-yt-${Date.now()}`,
        platform: 'YOUTUBE',
        accountName: `${brandData.name} YouTube`,
        accountHandle: `@${brandData.slug || 'channel'}`,
        platformAccountId: youtubeChannelId,
        status: 'CONNECTED',
      });
    }
    if (tiktokAccountId) {
      socialAccounts.push({
        id: `sa-tt-${Date.now()}`,
        platform: 'TIKTOK',
        accountName: `${brandData.name} TikTok`,
        accountHandle: tiktokAccountId.startsWith('@') ? tiktokAccountId : `@${tiktokAccountId}`,
        platformAccountId: tiktokAccountId,
        status: 'CONNECTED',
      });
    }
    if (pinterestBoardId) {
      socialAccounts.push({
        id: `sa-pt-${Date.now()}`,
        platform: 'PINTEREST',
        accountName: `${brandData.name} Pinterest`,
        accountHandle: pinterestBoardId,
        platformAccountId: pinterestBoardId,
        status: 'CONNECTED',
      });
    }

    const standaloneBrand = {
      id: brandId,
      orgId: orgId || 'org-system-01',
      ...brandData,
      linkedinOrgId: linkedinOrgId || '',
      twitterHandle: twitterHandle || '',
      youtubeChannelId: youtubeChannelId || '',
      tiktokAccountId: tiktokAccountId || '',
      pinterestBoardId: pinterestBoardId || '',
      isActive: true,
      metaConfig: {
        metaPageId: metaPageId || '',
        metaIgAccountId: metaIgAccountId || '',
        metaAccessToken: metaAccessToken || '',
        metaAppId: metaAppId || '',
        status: isMetaConnected ? 'CONNECTED' : 'DISCONNECTED',
      },
      sheetConfig: {
        scheduleSpreadsheetId: scheduleSpreadsheetId || '',
        scheduleSheetName: scheduleSheetName || 'Schedule',
        reportSpreadsheetId: reportSpreadsheetId || '',
        reportSheetPrefix: 'Report_',
      },
      socialAccounts,
      _count: { posts: 0 },
    };

    if (isOfflineMode) {
      STANDALONE_BRANDS.push(standaloneBrand);
      return standaloneBrand;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const brand = await tx.brand.create({
          data: {
            ...brandData,
            orgId,
          },
        });

        if (scheduleSpreadsheetId) {
          await tx.sheetConfig.create({
            data: {
              brandId: brand.id,
              scheduleSpreadsheetId,
              scheduleSheetName: scheduleSheetName || 'Schedule',
              reportSpreadsheetId,
            },
          });
        }

        return tx.brand.findUnique({
          where: { id: brand.id },
          include: { sheetConfig: true },
        });
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        STANDALONE_BRANDS.push(standaloneBrand);
        return standaloneBrand;
      }
      throw err;
    }
  },

  /**
   * Updates brand details and its sheet configuration.
   * @param {string} orgId
   * @param {string} brandId
   * @param {object} data
   */
  async update(orgId, brandId, data) {
    const {
      scheduleSpreadsheetId,
      scheduleSheetName,
      reportSpreadsheetId,
      metaPageId,
      metaIgAccountId,
      metaAccessToken,
      metaAppId,
      linkedinOrgId,
      twitterHandle,
      youtubeChannelId,
      tiktokAccountId,
      pinterestBoardId,
      ...brandData
    } = data;

    const brandIndex = STANDALONE_BRANDS.findIndex((b) => b.id === brandId);
    if (brandIndex !== -1) {
      const existing = STANDALONE_BRANDS[brandIndex];
      const mergedMeta = {
        metaPageId: metaPageId !== undefined ? metaPageId : existing.metaConfig?.metaPageId || '',
        metaIgAccountId: metaIgAccountId !== undefined ? metaIgAccountId : existing.metaConfig?.metaIgAccountId || '',
        metaAccessToken: metaAccessToken !== undefined ? metaAccessToken : existing.metaConfig?.metaAccessToken || '',
        metaAppId: metaAppId !== undefined ? metaAppId : existing.metaConfig?.metaAppId || '',
      };
      mergedMeta.status = Boolean(mergedMeta.metaAccessToken && (mergedMeta.metaPageId || mergedMeta.metaIgAccountId))
        ? 'CONNECTED'
        : 'DISCONNECTED';

      let updatedSocial = [...(existing.socialAccounts || [])];
      
      // Facebook
      if (mergedMeta.metaPageId) {
        const fbIdx = updatedSocial.findIndex((s) => s.platform === 'FACEBOOK');
        const fbAcc = {
          id: fbIdx !== -1 ? updatedSocial[fbIdx].id : `sa-fb-${Date.now()}`,
          platform: 'FACEBOOK',
          accountName: `${brandData.name || existing.name} Page`,
          accountHandle: `@${brandData.slug || existing.slug || 'page'}`,
          platformAccountId: mergedMeta.metaPageId,
          status: mergedMeta.metaAccessToken ? 'CONNECTED' : 'DISCONNECTED',
        };
        if (fbIdx !== -1) updatedSocial[fbIdx] = fbAcc;
        else updatedSocial.push(fbAcc);
      }
      
      // Instagram
      if (mergedMeta.metaIgAccountId) {
        const igIdx = updatedSocial.findIndex((s) => s.platform === 'INSTAGRAM');
        const igAcc = {
          id: igIdx !== -1 ? updatedSocial[igIdx].id : `sa-ig-${Date.now()}`,
          platform: 'INSTAGRAM',
          accountName: `${brandData.name || existing.name} Instagram`,
          accountHandle: `@${brandData.slug || existing.slug || 'ig'}`,
          platformAccountId: mergedMeta.metaIgAccountId,
          status: mergedMeta.metaAccessToken ? 'CONNECTED' : 'DISCONNECTED',
        };
        if (igIdx !== -1) updatedSocial[igIdx] = igAcc;
        else updatedSocial.push(igAcc);
      }

      // LinkedIn
      if (linkedinOrgId !== undefined) {
        const liIdx = updatedSocial.findIndex((s) => s.platform === 'LINKEDIN');
        if (linkedinOrgId) {
          const liAcc = {
            id: liIdx !== -1 ? updatedSocial[liIdx].id : `sa-li-${Date.now()}`,
            platform: 'LINKEDIN',
            accountName: `${brandData.name || existing.name} LinkedIn`,
            accountHandle: `@${brandData.slug || existing.slug || 'linkedin'}`,
            platformAccountId: linkedinOrgId,
            status: 'CONNECTED',
          };
          if (liIdx !== -1) updatedSocial[liIdx] = liAcc;
          else updatedSocial.push(liAcc);
        } else if (liIdx !== -1) {
          updatedSocial.splice(liIdx, 1);
        }
      }

      // Twitter / X
      if (twitterHandle !== undefined) {
        const twIdx = updatedSocial.findIndex((s) => s.platform === 'TWITTER');
        if (twitterHandle) {
          const twAcc = {
            id: twIdx !== -1 ? updatedSocial[twIdx].id : `sa-tw-${Date.now()}`,
            platform: 'TWITTER',
            accountName: `${brandData.name || existing.name} X`,
            accountHandle: twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`,
            platformAccountId: twitterHandle,
            status: 'CONNECTED',
          };
          if (twIdx !== -1) updatedSocial[twIdx] = twAcc;
          else updatedSocial.push(twAcc);
        } else if (twIdx !== -1) {
          updatedSocial.splice(twIdx, 1);
        }
      }

      // YouTube
      if (youtubeChannelId !== undefined) {
        const ytIdx = updatedSocial.findIndex((s) => s.platform === 'YOUTUBE');
        if (youtubeChannelId) {
          const ytAcc = {
            id: ytIdx !== -1 ? updatedSocial[ytIdx].id : `sa-yt-${Date.now()}`,
            platform: 'YOUTUBE',
            accountName: `${brandData.name || existing.name} YouTube`,
            accountHandle: `@${brandData.slug || existing.slug || 'yt'}`,
            platformAccountId: youtubeChannelId,
            status: 'CONNECTED',
          };
          if (ytIdx !== -1) updatedSocial[ytIdx] = ytAcc;
          else updatedSocial.push(ytAcc);
        } else if (ytIdx !== -1) {
          updatedSocial.splice(ytIdx, 1);
        }
      }

      // TikTok
      if (tiktokAccountId !== undefined) {
        const ttIdx = updatedSocial.findIndex((s) => s.platform === 'TIKTOK');
        if (tiktokAccountId) {
          const ttAcc = {
            id: ttIdx !== -1 ? updatedSocial[ttIdx].id : `sa-tt-${Date.now()}`,
            platform: 'TIKTOK',
            accountName: `${brandData.name || existing.name} TikTok`,
            accountHandle: tiktokAccountId.startsWith('@') ? tiktokAccountId : `@${tiktokAccountId}`,
            platformAccountId: tiktokAccountId,
            status: 'CONNECTED',
          };
          if (ttIdx !== -1) updatedSocial[ttIdx] = ttAcc;
          else updatedSocial.push(ttAcc);
        } else if (ttIdx !== -1) {
          updatedSocial.splice(ttIdx, 1);
        }
      }

      // Pinterest
      if (pinterestBoardId !== undefined) {
        const ptIdx = updatedSocial.findIndex((s) => s.platform === 'PINTEREST');
        if (pinterestBoardId) {
          const ptAcc = {
            id: ptIdx !== -1 ? updatedSocial[ptIdx].id : `sa-pt-${Date.now()}`,
            platform: 'PINTEREST',
            accountName: `${brandData.name || existing.name} Pinterest`,
            accountHandle: pinterestBoardId,
            platformAccountId: pinterestBoardId,
            status: 'CONNECTED',
          };
          if (ptIdx !== -1) updatedSocial[ptIdx] = ptAcc;
          else updatedSocial.push(ptAcc);
        } else if (ptIdx !== -1) {
          updatedSocial.splice(ptIdx, 1);
        }
      }

      STANDALONE_BRANDS[brandIndex] = {
        ...existing,
        ...brandData,
        linkedinOrgId: linkedinOrgId !== undefined ? linkedinOrgId : existing.linkedinOrgId || '',
        twitterHandle: twitterHandle !== undefined ? twitterHandle : existing.twitterHandle || '',
        youtubeChannelId: youtubeChannelId !== undefined ? youtubeChannelId : existing.youtubeChannelId || '',
        tiktokAccountId: tiktokAccountId !== undefined ? tiktokAccountId : existing.tiktokAccountId || '',
        pinterestBoardId: pinterestBoardId !== undefined ? pinterestBoardId : existing.pinterestBoardId || '',
        metaConfig: mergedMeta,
        sheetConfig: {
          ...existing.sheetConfig,
          ...(scheduleSpreadsheetId !== undefined ? { scheduleSpreadsheetId } : {}),
          ...(scheduleSheetName !== undefined ? { scheduleSheetName } : {}),
          ...(reportSpreadsheetId !== undefined ? { reportSpreadsheetId } : {}),
        },
        socialAccounts: updatedSocial,
      };

      if (isOfflineMode) {
        return STANDALONE_BRANDS[brandIndex];
      }
      try {
        await prisma.brand.update({
          where: { id: brandId },
          data: brandData,
        }).catch(() => {});
      } catch (e) {}
      return STANDALONE_BRANDS[brandIndex];
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const brand = await tx.brand.update({
          where: { id: brandId },
          data: brandData,
        });

        if (scheduleSpreadsheetId !== undefined || reportSpreadsheetId !== undefined) {
          await tx.sheetConfig.upsert({
            where: { brandId },
            create: {
              brandId,
              scheduleSpreadsheetId: scheduleSpreadsheetId || '',
              scheduleSheetName: scheduleSheetName || 'Schedule',
              reportSpreadsheetId,
            },
            update: {
              ...(scheduleSpreadsheetId !== undefined && { scheduleSpreadsheetId }),
              ...(scheduleSheetName !== undefined && { scheduleSheetName }),
              ...(reportSpreadsheetId !== undefined && { reportSpreadsheetId }),
            },
          });
        }

        return tx.brand.findUnique({
          where: { id: brandId },
          include: { sheetConfig: true },
        });
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return STANDALONE_BRANDS[brandIndex] || { id: brandId, ...brandData };
      }
      throw err;
    }
  },

  /**
   * Deletes a brand.
   * @param {string} orgId
   * @param {string} brandId
   */
  async delete(orgId, brandId) {
    const brandIndex = STANDALONE_BRANDS.findIndex((b) => b.id === brandId);
    if (brandIndex !== -1) {
      STANDALONE_BRANDS.splice(brandIndex, 1);
    }

    if (isOfflineMode) {
      return { count: 1 };
    }

    try {
      return await prisma.brand.deleteMany({
        where: scopeToTenant(orgId, { id: brandId }),
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        return { count: 1 };
      }
      throw err;
    }
  },
};
