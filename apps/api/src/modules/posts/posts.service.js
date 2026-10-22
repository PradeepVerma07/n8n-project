import crypto from 'node:crypto';
import { parse as csvParse } from 'csv-parse/sync';
import exceljs from 'exceljs';
import {
  parseLocalToUtc,
  validateStatusTransition,
  POST_STATUS,
  sheetRowSchema,
} from '@postpilot/shared';
import { AppError } from '../../middlewares/error.middleware.js';
import { prisma } from '../../config/prisma.js';
import { postsRepository } from './posts.repository.js';
import { brandsRepository } from '../brands/brands.repository.js';

export const postsService = {
  /**
   * Generates sequential or human-readable unique post customId (e.g., PP-2026-000456).
   */
  generateCustomId() {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PP-${year}-${randomHex}`;
  },

  /**
   * Creates a post.
   */
  async createPost(orgId, userId, data) {
    // 1. Verify brand belongs to tenant organization
    const brand = await brandsRepository.findById(orgId, data.brandId);

    if (!brand) {
      throw new AppError('Brand not found in your organization', 404, 'BRAND_NOT_FOUND');
    }

    const customId = data.customId || this.generateCustomId();
    const timezone = data.timezone || brand.defaultTimezone;

    // 2. Compute UTC scheduled timestamp
    const { dateTimeUtc, isoUtc } = parseLocalToUtc(
      data.scheduledDate,
      data.scheduledTime,
      timezone
    );

    // 3. Determine initial status based on brand approval rules
    let initialStatus = POST_STATUS.DRAFT;
    if (data.status === POST_STATUS.SCHEDULED) {
      if (brand.requiresApproval) {
        initialStatus = POST_STATUS.PENDING_APPROVAL;
      } else {
        initialStatus = POST_STATUS.SCHEDULED;
      }
    } else if (data.status) {
      initialStatus = data.status;
    }

    const scheduledLocal = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`);

    const postPayload = {
      customId,
      brandId: brand.id,
      createdById: userId,
      topic: data.topic || null,
      caption: data.caption,
      hashtags: data.hashtags || brand.defaultHashtags || null,
      firstComment: data.firstComment || null,
      linkUrl: data.linkUrl || null,
      postType: data.postType,
      mediaUrls: data.mediaUrls || [],
      scheduledLocal,
      timezone,
      scheduledUtc: dateTimeUtc.toJSDate(),
      status: initialStatus,
      source: data.source || 'DASHBOARD',
    };

    return postsRepository.create(postPayload, data.platforms || []);
  },

  /**
   * Updates an existing post.
   */
  async updatePost(orgId, userId, id, data) {
    const existing = await postsRepository.findById(id);
    if (!existing || existing.brand.orgId !== orgId) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    // Edits are prohibited once a post has entered the Queue or is Publishing
    if ([POST_STATUS.QUEUED, POST_STATUS.PUBLISHING, POST_STATUS.PUBLISHED].includes(existing.status)) {
      throw new AppError(
        `Cannot edit post with status "${existing.status}". Edits are locked once queued.`,
        400,
        'POST_EDIT_LOCKED'
      );
    }

    const updatePayload = {};

    if (data.caption !== undefined) updatePayload.caption = data.caption;
    if (data.topic !== undefined) updatePayload.topic = data.topic;
    if (data.hashtags !== undefined) updatePayload.hashtags = data.hashtags;
    if (data.firstComment !== undefined) updatePayload.firstComment = data.firstComment;
    if (data.linkUrl !== undefined) updatePayload.linkUrl = data.linkUrl;
    if (data.postType !== undefined) updatePayload.postType = data.postType;
    if (data.mediaUrls !== undefined) updatePayload.mediaUrls = data.mediaUrls;
    if (data.status !== undefined) updatePayload.status = data.status;

    // Handle rescheduling
    if (data.scheduledDate || data.scheduledTime || data.timezone) {
      const dateStr = data.scheduledDate || existing.scheduledDate;
      const timeStr = data.scheduledTime || existing.scheduledTime;
      const tzStr = data.timezone || existing.timezone;

      const { dateTimeUtc } = parseLocalToUtc(dateStr, timeStr, tzStr);
      updatePayload.scheduledLocal = new Date(`${dateStr}T${timeStr}:00`);
      updatePayload.timezone = tzStr;
      updatePayload.scheduledUtc = dateTimeUtc.toJSDate();
    }

    updatePayload.lastUpdatedBy = userId;

    return postsRepository.update(id, updatePayload, data.platforms);
  },

  /**
   * Duplicates a post as a new draft.
   */
  async duplicatePost(orgId, userId, id) {
    const existing = await postsRepository.findById(id);
    if (!existing || existing.brand.orgId !== orgId) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    const newCustomId = this.generateCustomId();

    const postPayload = {
      customId: newCustomId,
      brandId: existing.brandId,
      createdById: userId,
      topic: existing.topic ? `${existing.topic} (Copy)` : null,
      caption: existing.caption,
      hashtags: existing.hashtags,
      firstComment: existing.firstComment,
      linkUrl: existing.linkUrl,
      postType: existing.postType,
      mediaUrls: existing.mediaUrls,
      scheduledLocal: existing.scheduledLocal,
      timezone: existing.timezone,
      scheduledUtc: existing.scheduledUtc,
      status: POST_STATUS.DRAFT,
      source: 'DASHBOARD',
    };

    const platformsData = existing.platforms.map((p) => ({
      platform: p.platform,
      captionOverride: p.captionOverride,
      firstCommentOverride: p.firstCommentOverride,
    }));

    return postsRepository.create(postPayload, platformsData);
  },

  /**
   * Deletes a post.
   */
  async deletePost(orgId, id) {
    const existing = await postsRepository.findById(id);
    if (!existing || existing.brand.orgId !== orgId) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    if (existing.status === POST_STATUS.PUBLISHING) {
      throw new AppError('Cannot delete a post currently being published', 400, 'POST_PUBLISHING_LOCKED');
    }

    await postsRepository.delete(id);
    return { success: true };
  },

  /**
   * Submits a post for approval.
   */
  async submitForApproval(orgId, userId, id) {
    const existing = await postsRepository.findById(id);
    if (!existing || existing.brand.orgId !== orgId) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    const transition = validateStatusTransition(existing.status, POST_STATUS.PENDING_APPROVAL);
    if (!transition.valid) {
      throw new AppError(transition.error, 400, 'INVALID_TRANSITION');
    }

    return postsRepository.updateStatus(id, POST_STATUS.PENDING_APPROVAL);
  },

  /**
   * Approves a post.
   */
  async approvePost(orgId, approverId, id) {
    const existing = await postsRepository.findById(id);
    if (!existing || existing.brand.orgId !== orgId) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    const nextStatus = existing.scheduledUtc ? POST_STATUS.SCHEDULED : POST_STATUS.APPROVED;
    const transition = validateStatusTransition(existing.status, nextStatus);
    if (!transition.valid) {
      throw new AppError(transition.error, 400, 'INVALID_TRANSITION');
    }

    return postsRepository.updateStatus(id, nextStatus, {
      approvedById: approverId,
      rejectionReason: null,
    });
  },

  /**
   * Rejects a post with a reason.
   */
  async rejectPost(orgId, approverId, id, rejectionReason) {
    const existing = await postsRepository.findById(id);
    if (!existing || existing.brand.orgId !== orgId) {
      throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    }

    return postsRepository.updateStatus(id, POST_STATUS.DRAFT, {
      rejectionReason: rejectionReason || 'Rejected during review',
      approvedById: null,
    });
  },

  /**
   * Gets posts for content calendar rendering within a date window.
   */
  async getCalendarPosts(orgId, { brandId, startUtc, endUtc }) {
    if (!startUtc || !endUtc) {
      throw new AppError('startUtc and endUtc query parameters are required', 400, 'MISSING_DATE_WINDOW');
    }

    return postsRepository.findForCalendar(orgId, { brandId, startUtc, endUtc });
  },

  /**
   * Bulk imports schedule rows from CSV or XLSX matching the 19-column Google Sheets contract.
   *
   * @param {string} orgId
   * @param {string} userId
   * @param {Buffer} buffer
   * @param {'csv'|'xlsx'} fileType
   */
  async bulkImport(orgId, userId, buffer, fileType = 'csv') {
    let rawRows = [];

    if (fileType === 'csv') {
      rawRows = csvParse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else {
      const workbook = new exceljs.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      const headers = [];

      sheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim();
      });

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) rowData[header] = cell.value?.toString().trim();
        });
        rawRows.push(rowData);
      });
    }

    const results = {
      total: rawRows.length,
      imported: 0,
      errors: [],
    };

    // Cache brands for fast lookup
    const brands = await brandsRepository.findAll(orgId);
    const brandMapByName = new Map(brands.map((b) => [b.name.toLowerCase(), b]));
    const brandMapById = new Map(brands.map((b) => [b.id, b]));
    const brandMapBySlug = new Map(brands.map((b) => [b.slug, b]));

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // Accounting for 1-based index and header row

      // Validate against Google Sheet 19-column contract schema
      const validation = sheetRowSchema.safeParse(row);
      if (!validation.success) {
        results.errors.push({
          row: rowNumber,
          postId: row.post_id || 'N/A',
          error: validation.error.issues.map((iss) => iss.message).join('; '),
        });
        continue;
      }

      const validData = validation.data;

      // Find matching brand by id, slug, or client_name
      const brand =
        brandMapById.get(validData.brand_id) ||
        brandMapBySlug.get(validData.brand_id) ||
        brandMapByName.get(validData.client_name.toLowerCase());

      if (!brand) {
        results.errors.push({
          row: rowNumber,
          postId: validData.post_id || 'N/A',
          error: `Brand "${validData.brand_id || validData.client_name}" not found in organization`,
        });
        continue;
      }

      try {
        const timezone = validData.timezone || brand.defaultTimezone;
        const { dateTimeUtc } = parseLocalToUtc(
          validData.scheduled_date,
          validData.scheduled_time,
          timezone
        );

        const customId = validData.post_id || this.generateCustomId();
        const scheduledLocal = new Date(`${validData.scheduled_date}T${validData.scheduled_time}:00`);

        const postPayload = {
          customId,
          brandId: brand.id,
          createdById: userId,
          topic: validData.topic || null,
          caption: validData.caption,
          hashtags: validData.hashtags || brand.defaultHashtags || null,
          firstComment: validData.first_comment || null,
          linkUrl: validData.link_url || null,
          postType: validData.post_type.toUpperCase(),
          mediaUrls: validData.media_urls || [],
          scheduledLocal,
          timezone,
          scheduledUtc: dateTimeUtc.toJSDate(),
          status: validData.status.toUpperCase(),
          source: 'SHEET',
          sheetRowIndex: rowNumber,
        };

        const platformsData = validData.platforms.map((p) => ({
          platform: p.toUpperCase(),
          captionOverride: null,
          firstCommentOverride: null,
        }));

        await postsRepository.create(postPayload, platformsData);
        results.imported++;
      } catch (err) {
        results.errors.push({
          row: rowNumber,
          postId: validData.post_id || 'N/A',
          error: err.message,
        });
      }
    }

    return results;
  },
};
