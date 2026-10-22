import { prisma } from '../../config/prisma.js';
import { googleSheetsService } from './google-sheets.service.js';
import { POST_STATUS, PLATFORMS, computeScheduledUtc } from '@postpilot/shared';
import { postsRepository } from '../posts/posts.repository.js';
import { brandsRepository } from '../brands/brands.repository.js';

let inMemorySheetConfigs = {};

function isDbConnectionError(err) {
  return (
    err?.message?.includes("Can't reach database server") ||
    err?.message?.includes('database server is running') ||
    err?.code === 'P1001'
  );
}

export const sheetsService = {
  /**
   * Retrieves Google Sheets configuration for a brand.
   *
   * @param {string} brandId
   * @returns {Promise<object>}
   */
  async getConfig(brandId) {
    if (inMemorySheetConfigs[brandId]?.scheduleSpreadsheetId) {
      return inMemorySheetConfigs[brandId];
    }
    try {
      const config = await prisma.sheetConfig.findUnique({
        where: { brandId },
        include: { brand: true },
      });

      return (
        config || inMemorySheetConfigs[brandId] || {
          brandId,
          scheduleSpreadsheetId: '',
          scheduleSheetName: 'Schedule',
          reportSpreadsheetId: '',
          reportSheetPrefix: 'Report_',
          syncStatus: 'NOT_CONFIGURED',
        }
      );
    } catch (err) {
      if (isDbConnectionError(err)) {
        return (
          inMemorySheetConfigs[brandId] || {
            brandId,
            scheduleSpreadsheetId: '',
            scheduleSheetName: 'Schedule',
            reportSpreadsheetId: '',
            reportSheetPrefix: 'Report_',
            syncStatus: 'NOT_CONFIGURED',
          }
        );
      }
      throw err;
    }
  },

  /**
   * Saves or updates Google Sheets configuration for a brand.
   *
   * @param {string} brandId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async saveConfig(brandId, data) {
    try {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brand) {
        const err = new Error(`Brand not found with ID: ${brandId}`);
        err.statusCode = 404;
        throw err;
      }

      return await prisma.sheetConfig.upsert({
        where: { brandId },
        update: {
          scheduleSpreadsheetId: data.scheduleSpreadsheetId,
          scheduleSheetName: data.scheduleSheetName || 'Schedule',
          reportSpreadsheetId: data.reportSpreadsheetId || null,
          reportSheetPrefix: data.reportSheetPrefix || 'Report_',
          syncStatus: 'CONFIGURED',
        },
        create: {
          brandId,
          scheduleSpreadsheetId: data.scheduleSpreadsheetId,
          scheduleSheetName: data.scheduleSheetName || 'Schedule',
          reportSpreadsheetId: data.reportSpreadsheetId || null,
          reportSheetPrefix: data.reportSheetPrefix || 'Report_',
          syncStatus: 'CONFIGURED',
        },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        inMemorySheetConfigs[brandId] = {
          brandId,
          scheduleSpreadsheetId: data.scheduleSpreadsheetId,
          scheduleSheetName: data.scheduleSheetName || 'Schedule',
          reportSpreadsheetId: data.reportSpreadsheetId || null,
          reportSheetPrefix: data.reportSheetPrefix || 'Report_',
          syncStatus: 'CONFIGURED',
          updatedAt: new Date(),
        };
        return inMemorySheetConfigs[brandId];
      }
      throw err;
    }
  },

  /**
   * Tests spreadsheet connectivity and permissions.
   *
   * @param {string} spreadsheetId
   * @returns {Promise<object>}
   */
  async testConnection(spreadsheetId) {
    if (!spreadsheetId) {
      const err = new Error('spreadsheetId is required');
      err.statusCode = 400;
      throw err;
    }

    return googleSheetsService.testConnection(spreadsheetId);
  },

  /**
   * Executes a bi-directional synchronization pass between Google Sheet and PostPilot DB.
   *
   * @param {string} brandId
   * @returns {Promise<object>} Sync summary
   */
  async syncSheet(brandId) {
    let brand;
    try {
      brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: { sheetConfig: true },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        brand = await brandsRepository.findById(null, brandId);
      } else {
        throw err;
      }
    }

    if (!brand) {
      brand = await brandsRepository.findById(null, brandId);
    }

    if (!brand) {
      const err = new Error(`Brand not found with ID: ${brandId}`);
      err.statusCode = 404;
      throw err;
    }

    const sheetConfig = inMemorySheetConfigs[brandId]?.scheduleSpreadsheetId
      ? inMemorySheetConfigs[brandId]
      : (brand.sheetConfig || inMemorySheetConfigs[brandId]);
    if (!sheetConfig || !sheetConfig.scheduleSpreadsheetId) {
      const err = new Error('No Google Sheet configured for this brand');
      err.statusCode = 400;
      throw err;
    }

    // Set sync status to IN_PROGRESS
    try {
      await prisma.sheetConfig.update({
        where: { brandId },
        data: { syncStatus: 'IN_PROGRESS' },
      });
    } catch (err) {
      if (sheetConfig) sheetConfig.syncStatus = 'IN_PROGRESS';
    }

    try {
      const { validRows, invalidRows, checksum, isMock } =
        await googleSheetsService.readScheduleRows(
          sheetConfig.scheduleSpreadsheetId,
          sheetConfig.scheduleSheetName || 'Schedule'
        );

      let createdPosts = 0;
      let updatedPosts = 0;

      for (const row of validRows) {
        const customId =
          row.post_id || `PP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const timezone = row.timezone || brand.defaultTimezone || 'Asia/Kolkata';
        const scheduledDate = row.scheduled_date;
        const scheduledTime = row.scheduled_time;
        const scheduledUtc = computeScheduledUtc(scheduledDate, scheduledTime, timezone);

        // Normalize platforms from employee checklist
        const PLATFORM_ALIAS = {
          X: 'TWITTER',
          TWITTER: 'TWITTER',
          FACEBOOK: 'FACEBOOK',
          FB: 'FACEBOOK',
          INSTAGRAM: 'INSTAGRAM',
          IG: 'INSTAGRAM',
          LINKEDIN: 'LINKEDIN',
          LI: 'LINKEDIN',
          YOUTUBE: 'YOUTUBE',
          YT: 'YOUTUBE',
          TIKTOK: 'TIKTOK',
          TT: 'TIKTOK',
          PINTEREST: 'PINTEREST',
          PIN: 'PINTEREST',
          GOOGLE_BUSINESS: 'GOOGLE_BUSINESS',
        };

        let rawPlatforms = row.platforms;
        if (typeof rawPlatforms === 'string') {
          rawPlatforms = rawPlatforms.split(',').map((p) => p.trim());
        }
        const validPlatforms = (rawPlatforms || [])
          .map((p) => {
            const upper = String(p).trim().toUpperCase();
            return PLATFORM_ALIAS[upper] || upper;
          })
          .filter((p) => Object.values(PLATFORMS).includes(p));

        // Normalize media URLs
        let mediaUrls = row.media_urls || [];
        if (typeof mediaUrls === 'string') {
          mediaUrls = mediaUrls.split(',').map((u) => u.trim()).filter((u) => u.startsWith('http://') || u.startsWith('https://'));
        }

        const existingPost = await postsRepository.findByCustomId(customId);

        if (!existingPost) {
          const postPayload = {
            customId,
            brandId: brand.id,
            source: 'GOOGLE_SHEETS',
            topic: row.topic || null,
            caption: row.caption || '',
            hashtags: row.hashtags || null,
            firstComment: row.first_comment || null,
            linkUrl: row.link_url || null,
            postType: String(row.post_type || 'IMAGE').toUpperCase(),
            mediaUrls,
            scheduledLocal: new Date(`${scheduledDate}T${scheduledTime}`),
            timezone,
            scheduledUtc,
            status: String(row.status || 'SCHEDULED').toUpperCase(),
            sheetRowIndex: row.rowIndex,
            lastUpdatedBy: row.last_updated_by || 'sheets_sync',
          };
          const platformsData = validPlatforms.map((p) => ({
            platform: p,
            captionOverride: null,
            firstCommentOverride: null,
          }));

          await postsRepository.create(postPayload, platformsData);
          createdPosts++;
        } else {
          if (
            existingPost.status === POST_STATUS.DRAFT ||
            existingPost.status === POST_STATUS.SCHEDULED
          ) {
            await postsRepository.updateStatus(existingPost.id, String(row.status || existingPost.status).toUpperCase());
            updatedPosts++;
          }
        }
      }

      // Update SheetConfig with success metrics
      try {
        await prisma.sheetConfig.update({
          where: { brandId },
          data: {
            lastSyncAt: new Date(),
            lastSyncRowChecksum: checksum,
            syncStatus: 'SUCCESS',
            syncError: null,
          },
        });
      } catch (err) {
        if (sheetConfig) {
          sheetConfig.lastSyncAt = new Date();
          sheetConfig.lastSyncRowChecksum = checksum;
          sheetConfig.syncStatus = 'SUCCESS';
        }
      }

      return {
        success: true,
        brandId,
        totalRows: validRows.length + invalidRows.length,
        validRowsCount: validRows.length,
        invalidRowsCount: invalidRows.length,
        createdPosts,
        updatedPosts,
        checksum,
        isMock,
        lastSyncAt: new Date().toISOString(),
      };
    } catch (err) {
      try {
        await prisma.sheetConfig.update({
          where: { brandId },
          data: {
            syncStatus: 'FAILED',
            syncError: err.message,
          },
        });
      } catch (e) {
        if (sheetConfig) {
          sheetConfig.syncStatus = 'FAILED';
          sheetConfig.syncError = err.message;
        }
      }
      throw err;
    }
  },
};
