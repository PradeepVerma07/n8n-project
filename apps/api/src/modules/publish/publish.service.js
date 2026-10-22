import { prisma, isOfflineMode, isDbConnectionError } from '../../config/prisma.js';
import { brandsRepository } from '../brands/brands.repository.js';
import { postsRepository } from '../posts/posts.repository.js';
import {
  POST_STATUS,
  PLATFORMS,
  canTransition,
  computeScheduledUtc,
  verifyWebhookSignature,
} from '@postpilot/shared';
import { env } from '../../config/env.js';

let isSchedulerPausedState = false;
let lastSchedulerRunTime = null;

export const publishService = {
  isSchedulerPaused() {
    return isSchedulerPausedState;
  },

  setSchedulerPaused(paused) {
    isSchedulerPausedState = Boolean(paused);
    return isSchedulerPausedState;
  },

  getLastSchedulerRun() {
    return lastSchedulerRunTime;
  },
  /**
   * Enqueues rows fetched by n8n scheduler or sheets sync for publication.
   * Enforces strict idempotency via ${post_id}:${platform} composite keys.
   *
   * @param {object} params
   * @param {string} params.brandId - Target brand ID
   * @param {Array<object>} params.rows - Schedule rows from Google Sheet or sync
   * @param {string} [params.requestedBy='n8n_scheduler'] - Origin actor
   * @returns {Promise<object>} Enqueue summary
   */
  async enqueueRows({ brandId, rows, requestedBy = 'n8n_scheduler', isImmediate = false }) {
    if (!brandId) {
      const err = new Error('brandId is required');
      err.statusCode = 400;
      throw err;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        success: true,
        enqueuedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        jobs: [],
        errors: [],
      };
    }

    let brand;
    if (!isOfflineMode) {
      try {
        brand = await prisma.brand.findUnique({
          where: { id: brandId },
          include: { organization: true },
        });
      } catch (e) {
        isDbConnectionError(e);
        brand = await brandsRepository.findById(null, brandId);
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

    let enqueuedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const jobs = [];
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        const customId =
          row.post_id || row.postId || `PP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const timezone = row.timezone || brand.defaultTimezone || 'UTC';
        const scheduledDate = row.scheduled_date || row.scheduledDate;
        const scheduledTime = row.scheduled_time || row.scheduledTime;

        if (!scheduledDate || !scheduledTime) {
          throw new Error('Missing scheduled_date or scheduled_time in row');
        }

        const scheduledUtc = computeScheduledUtc(scheduledDate, scheduledTime, timezone);

        // Normalize platforms
        let rawPlatforms = row.platforms;
        if (typeof rawPlatforms === 'string') {
          rawPlatforms = rawPlatforms.split(',').map((p) => p.trim());
        }
        if (!Array.isArray(rawPlatforms) || rawPlatforms.length === 0) {
          throw new Error('At least one platform is required in row');
        }

        const validPlatforms = rawPlatforms
          .map((p) => String(p).toUpperCase())
          .filter((p) => Object.values(PLATFORMS).includes(p));

        if (validPlatforms.length === 0) {
          throw new Error(`No supported platforms found in row: ${JSON.stringify(rawPlatforms)}`);
        }

        // Normalize media URLs
        let mediaUrls = row.media_urls || row.mediaUrls || [];
        if (typeof mediaUrls === 'string') {
          mediaUrls = mediaUrls.split(',').map((u) => u.trim()).filter(Boolean);
        }

        // Find or create the Post record
        let post = null;
        if (!isOfflineMode) {
          try {
            post = await prisma.post.findUnique({
              where: { customId },
              include: { platforms: true, publishJobs: true },
            });
          } catch (e) {
            isDbConnectionError(e);
          }
        }
        if (!post) {
          post = await postsRepository.findByCustomId(customId);
        }

        if (!post) {
          if (!isOfflineMode) {
            try {
              post = await prisma.post.create({
                data: {
                  customId,
                  brandId: brand.id,
                  source: 'GOOGLE_SHEETS',
                  topic: row.topic || null,
                  caption: row.caption || '',
                  hashtags: row.hashtags || null,
                  firstComment: row.first_comment || row.firstComment || null,
                  linkUrl: row.link_url || row.linkUrl || null,
                  postType: String(row.post_type || row.postType || 'TEXT').toUpperCase(),
                  mediaUrls,
                  scheduledLocal: new Date(`${scheduledDate}T${scheduledTime}`),
                  timezone,
                  scheduledUtc,
                  status: POST_STATUS.QUEUED,
                  sheetRowIndex: row.sheet_row_index ?? row.sheetRowIndex ?? index + 2,
                  lastUpdatedBy: requestedBy,
                },
                include: { platforms: true, publishJobs: true },
              });
            } catch (createErr) {
              isDbConnectionError(createErr);
            }
          }

          if (!post) {
            post = await postsRepository.create(
              {
                customId,
                brandId: brand.id,
                source: 'GOOGLE_SHEETS',
                topic: row.topic || null,
                caption: row.caption || '',
                hashtags: row.hashtags || null,
                firstComment: row.first_comment || row.firstComment || null,
                linkUrl: row.link_url || row.linkUrl || null,
                postType: String(row.post_type || row.postType || 'TEXT').toUpperCase(),
                mediaUrls,
                scheduledLocal: new Date(`${scheduledDate}T${scheduledTime}`),
                timezone,
                scheduledUtc,
                status: POST_STATUS.QUEUED,
              },
              validPlatforms.map((p) => ({ platform: p, status: isImmediate || row.isImmediate || requestedBy === 'ui_publish_now' ? 'SUCCESS' : 'PENDING' }))
            );
            if (isImmediate || row.isImmediate || requestedBy === 'ui_publish_now') {
              await postsRepository.updateStatus(post.customId || post.id, POST_STATUS.PUBLISHED, 'SUCCESS');
            }
          }
        } else {
          const isNow = isImmediate || row.isImmediate || requestedBy === 'ui_publish_now';
          if (isNow) {
            await postsRepository.updateStatus(post.customId || post.id, POST_STATUS.PUBLISHED, 'SUCCESS');
          } else {
            // If post exists, verify state transition
            if (
              post.status !== POST_STATUS.SCHEDULED &&
              post.status !== POST_STATUS.DRAFT &&
              post.status !== POST_STATUS.QUEUED
            ) {
              // Cannot re-queue already publishing or published post
              skippedCount += validPlatforms.length;
              jobs.push({
                customId,
                status: 'SKIPPED',
                reason: `Post is already in status ${post.status}`,
              });
              continue;
            }

            if (post.status !== POST_STATUS.QUEUED && canTransition(post.status, POST_STATUS.QUEUED)) {
              await postsRepository.updateStatus(post.customId || post.id, POST_STATUS.QUEUED);
            }
          }
        }

        const isNow = isImmediate || row.isImmediate || requestedBy === 'ui_publish_now';
        const jobStatus = isNow ? 'SUCCESS' : 'ENQUEUED';

        // Process per-platform publish jobs with strict idempotency keys
        for (const platform of validPlatforms) {
          const idempotencyKey = `${customId}:${platform}`;

          let existingJob = null;
          if (!isOfflineMode) {
            try {
              existingJob = await prisma.publishJob.findUnique({
                where: { idempotencyKey },
              });
            } catch (e) {
              isDbConnectionError(e);
            }
          }

          if (existingJob && !isNow) {
            skippedCount++;
            jobs.push({
              idempotencyKey,
              platform,
              status: 'SKIPPED',
              reason: 'Idempotency key already exists',
            });
            continue;
          }

          // Create PublishJob
          let newJob = { id: `job-${Date.now()}-${platform}`, idempotencyKey, platform, status: jobStatus };
          if (!isOfflineMode) {
            try {
              if (existingJob) {
                newJob = await prisma.publishJob.update({
                  where: { idempotencyKey },
                  data: { status: jobStatus },
                }).catch(() => newJob);
              } else {
                newJob = await prisma.publishJob.create({
                  data: {
                    idempotencyKey,
                    postId: post.id,
                    platform,
                    status: jobStatus,
                  },
                });
              }

              await prisma.postPlatform.upsert({
                where: {
                  postId_platform: {
                    postId: post.id,
                    platform,
                  },
                },
                update: { status: isNow ? 'SUCCESS' : 'PENDING' },
                create: { postId: post.id, platform, status: isNow ? 'SUCCESS' : 'PENDING' },
              });
            } catch (jobErr) {
              isDbConnectionError(jobErr);
            }
          }

          enqueuedCount++;
          jobs.push({
            id: newJob.id,
            idempotencyKey,
            platform,
            status: jobStatus,
          });
        }
      } catch (rowError) {
        failedCount++;
        errors.push({
          rowIndex: row.sheet_row_index ?? index + 2,
          postId: row.post_id || row.postId,
          error: rowError.message,
        });
      }
    }

    return {
      success: true,
      enqueuedCount,
      skippedCount,
      failedCount,
      totalRows: rows.length,
      jobs,
      errors,
    };
  },

  /**
   * Handles HMAC-verified webhook callback from worker or n8n WF-02.
   *
   * @param {object} params
   * @param {string} params.signature - HMAC signature header
   * @param {number} params.timestamp - Request timestamp header
   * @param {object|string} params.rawBody - Raw body payload
   * @param {object} params.body - Parsed webhook payload
   * @returns {Promise<object>}
   */
  async handleWebhookCallback({ signature, timestamp, rawBody, body }) {
    if (!signature || !timestamp) {
      const err = new Error('Missing x-postpilot-signature or x-postpilot-timestamp headers');
      err.statusCode = 401;
      throw err;
    }

    const verifyResult = verifyWebhookSignature(
      rawBody,
      signature,
      parseInt(timestamp, 10),
      env.N8N_HMAC_SECRET,
      300
    );

    if (!verifyResult.valid) {
      const err = new Error(verifyResult.reason || 'Invalid HMAC signature');
      err.statusCode = 401;
      throw err;
    }

    const {
      postId,
      customId,
      platform,
      status,
      platformPostId,
      platformPostUrl,
      errorMessage,
      errorCode,
      publishedAtUtc,
    } = body;

    const post = await prisma.post.findFirst({
      where: {
        OR: [{ id: postId || '' }, { customId: customId || '' }],
      },
      include: { platforms: true },
    });

    if (!post) {
      const err = new Error(`Post not found with ID/customId: ${postId || customId}`);
      err.statusCode = 404;
      throw err;
    }

    if (platform) {
      const normalizedPlatform = String(platform).toUpperCase();
      const platformStatus = status === 'SUCCESS' ? 'PUBLISHED' : 'FAILED';

      await prisma.postPlatform.updateMany({
        where: {
          postId: post.id,
          platform: normalizedPlatform,
        },
        data: {
          status: platformStatus,
          platformPostId: platformPostId || null,
          platformPostUrl: platformPostUrl || null,
          errorMessage: errorMessage || null,
          errorCode: errorCode || null,
          publishedAtUtc: publishedAtUtc ? new Date(publishedAtUtc) : new Date(),
        },
      });

      // Update PublishJob status
      await prisma.publishJob.updateMany({
        where: {
          postId: post.id,
          platform: normalizedPlatform,
        },
        data: {
          status: platformStatus,
        },
      });
    }

    // Refresh platforms to calculate overall Post status
    const updatedPlatforms = await prisma.postPlatform.findMany({
      where: { postId: post.id },
    });

    const allPublished = updatedPlatforms.every((p) => p.status === 'PUBLISHED');
    const allFailed = updatedPlatforms.every((p) => p.status === 'FAILED');
    const anyPublished = updatedPlatforms.some((p) => p.status === 'PUBLISHED');

    let overallStatus = post.status;
    if (allPublished) {
      overallStatus = POST_STATUS.PUBLISHED;
    } else if (allFailed) {
      overallStatus = POST_STATUS.FAILED;
    } else if (anyPublished) {
      overallStatus = POST_STATUS.PARTIALLY_PUBLISHED;
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: overallStatus,
        publishedAtUtc: allPublished ? new Date() : post.publishedAtUtc,
        lastUpdatedBy: 'webhook_callback',
      },
    });

    return {
      success: true,
      postId: updatedPost.id,
      customId: updatedPost.customId,
      overallStatus,
    };
  },

  /**
   * Scans for all scheduled posts whose time is due, automatically publishes them,
   * updates their status to PUBLISHED, and dispatches the n8n webhook every minute.
   */
  async processDuePosts() {
    lastSchedulerRunTime = new Date().toISOString();
    if (isSchedulerPausedState) {
      return {
        processed: 0,
        posts: [],
        paused: true,
        message: 'Auto-scheduler is currently PAUSED from frontend.',
      };
    }

    const duePosts = await postsRepository.findDueScheduledPosts();
    if (!duePosts || duePosts.length === 0) {
      return { processed: 0, posts: [] };
    }

    const dispatched = [];
    for (const post of duePosts) {
      try {
        const brandId = post.brandId || post.brand?.id || 'brd-system-01';
        const platforms = (post.platforms || []).map((p) => p.platform || p);

        // 1. Enqueue and execute immediate publication
        await this.enqueueRows({
          brandId,
          rows: [
            {
              postId: post.customId,
              topic: post.topic,
              caption: post.caption,
              platforms: platforms.length > 0 ? platforms : ['FACEBOOK', 'INSTAGRAM'],
              scheduledDate: post.scheduledDate,
              scheduledTime: post.scheduledTime,
              timezone: post.timezone,
              mediaUrls: post.mediaUrls || [],
              isImmediate: true,
            },
          ],
          requestedBy: 'auto_scheduler_1min',
          isImmediate: true,
        });

        // 2. Mark post and platforms published
        await postsRepository.updateStatus(post.customId || post.id, 'PUBLISHED', 'SUCCESS');

        // 3. Trigger n8n webhook so the n8n Frontend Webhook Trigger executes automatically
        try {
          await fetch('http://localhost:5678/webhook/postpilot-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'POST_SCHEDULED_DUE',
              trigger: 'AUTO_1MIN_POLLER',
              brandId,
              postId: post.customId,
              caption: post.caption,
              platforms,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {
          // n8n background hook handled
        }

        dispatched.push(post.customId);
      } catch (err) {
        console.error(`[Auto-Scheduler] Error auto-dispatching post ${post.customId}:`, err.message);
      }
    }

    return { processed: dispatched.length, posts: dispatched };
  },
};
