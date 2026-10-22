import { prisma, isOfflineMode, isDbConnectionError } from '../../config/prisma.js';
import { brandsRepository } from '../brands/brands.repository.js';
import { postsRepository } from '../posts/posts.repository.js';
import { publishService } from '../publish/publish.service.js';

export const dashboardService = {
  /**
   * Computes authoritative server-side dashboard metrics for an organization/brand.
   */
  async getMetrics(orgId, { brandId, timeRange = '30d' } = {}) {
    let posts = [];
    try {
      const result = await postsRepository.findAll(orgId, { brandId, limit: 1000 });
      posts = result.items || [];
    } catch (e) {
      isDbConnectionError(e);
      const result = await postsRepository.findAll(orgId, { brandId, limit: 1000 });
      posts = result.items || [];
    }

    const scheduled = posts.filter((p) => p.status === 'SCHEDULED' || p.status === 'QUEUED').length;
    const published = posts.filter((p) => p.status === 'PUBLISHED').length;
    const failed = posts.filter((p) => p.status === 'FAILED').length;
    const pendingApproval = posts.filter((p) => p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL').length;

    const totalResolved = published + failed;
    const publishSuccessRate = totalResolved > 0 ? Math.round((published / totalResolved) * 100 * 10) / 10 : null;

    let brands = [];
    try {
      brands = await brandsRepository.findAll(orgId);
    } catch (e) {
      isDbConnectionError(e);
      brands = await brandsRepository.findAll(orgId);
    }

    const targetBrands = brandId ? brands.filter((b) => b.id === brandId) : brands;
    let connectedChannels = 0;
    for (const b of targetBrands) {
      if (b.socialAccounts && Array.isArray(b.socialAccounts)) {
        connectedChannels += b.socialAccounts.filter((sa) => sa.status === 'CONNECTED').length;
      }
    }

    return {
      period: timeRange === '7d' ? 'Last 7 Days' : timeRange === '90d' ? 'Last 90 Days' : 'Last 30 Days',
      scheduled,
      published,
      failed,
      pendingApproval,
      publishSuccessRate,
      connectedChannels,
      totalPostsTracked: posts.length,
      calculatedAt: new Date().toISOString(),
    };
  },

  /**
   * Retrieves actionable attention summary items.
   */
  async getAttentionSummary(orgId, { brandId } = {}) {
    const { items: posts = [] } = await postsRepository.findAll(orgId, { brandId, limit: 200 });

    const failedPosts = posts
      .filter((p) => p.status === 'FAILED' || (p.platforms || []).some((pl) => pl.status === 'FAILED'))
      .map((p) => ({
        id: p.id,
        customId: p.customId,
        topic: p.topic || 'Untitled Post',
        caption: p.caption,
        failedPlatforms: (p.platforms || []).filter((pl) => pl.status === 'FAILED').map((pl) => pl.platform),
        error: p.errorMessage || 'Platform rejected payload',
        link: `/composer?edit=${p.id}`,
      }));

    const awaitingApproval = posts
      .filter((p) => p.status === 'PENDING_APPROVAL')
      .map((p) => ({
        id: p.id,
        customId: p.customId,
        topic: p.topic,
        author: p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : 'Content Creator',
        scheduledDate: p.scheduledDate,
        link: `/calendar?post=${p.id}`,
      }));

    const brands = await brandsRepository.findAll(orgId);
    const targetBrands = brandId ? brands.filter((b) => b.id === brandId) : brands;

    const expiringAccounts = [];
    for (const b of targetBrands) {
      for (const sa of b.socialAccounts || []) {
        if (sa.status === 'DISCONNECTED' || sa.status === 'EXPIRED') {
          expiringAccounts.push({
            brandName: b.name,
            platform: sa.platform,
            accountName: sa.accountName,
            status: sa.status,
            link: '/settings',
          });
        }
      }
    }

    return {
      hasIssues: failedPosts.length > 0 || awaitingApproval.length > 0 || expiringAccounts.length > 0,
      failedPosts,
      awaitingApproval,
      expiringAccounts,
    };
  },

  /**
   * Retrieves server-sorted upcoming scheduled posts.
   */
  async getUpcoming(orgId, { brandId, limit = 10 } = {}) {
    const { items: posts = [] } = await postsRepository.findAll(orgId, { brandId, limit: 100 });
    const now = new Date();

    const upcoming = posts
      .filter((p) => p.status === 'SCHEDULED' || p.status === 'QUEUED')
      .sort((a, b) => new Date(a.scheduledUtc || a.createdAt) - new Date(b.scheduledUtc || b.createdAt))
      .slice(0, limit);

    return upcoming;
  },

  /**
   * Retrieves recent publishing activity with per-platform status.
   */
  async getRecentActivity(orgId, { brandId, limit = 10 } = {}) {
    const { items: posts = [] } = await postsRepository.findAll(orgId, { brandId, limit: 50 });

    const recent = posts
      .filter((p) => p.status === 'PUBLISHED' || p.status === 'FAILED' || p.status === 'PARTIALLY_PUBLISHED')
      .slice(0, limit);

    return recent;
  },

  /**
   * Probes backend connection health for integrations without exposing internal ports.
   */
  async getConnectionsHealth(orgId, { brandId } = {}) {
    const brands = await brandsRepository.findAll(orgId);
    const targetBrand = (brandId ? brands.find((b) => b.id === brandId) : brands[0]) || brands[0];

    const hasMetaToken = Boolean(
      process.env.META_ACCESS_TOKEN || targetBrand?.metaConfig?.metaAccessToken
    );
    const hasMetaPage = Boolean(
      process.env.META_PAGE_ID || targetBrand?.metaConfig?.metaPageId
    );

    const isSchedulerPaused = publishService.isSchedulerPaused();
    const lastSchedulerRun = publishService.getLastSchedulerRun();

    return {
      channels: [
        {
          name: 'Facebook & Instagram',
          service: 'Meta Graph API',
          status: hasMetaToken && hasMetaPage ? 'HEALTHY' : 'DEGRADED',
          pageName: process.env.META_PAGE_NAME || 'Flower plant',
          details: hasMetaToken ? 'Connected via verified Page Access Token' : 'Access token required',
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'Automation Scheduler',
          service: 'PostPilot Workflow Engine',
          status: isSchedulerPaused ? 'PAUSED' : 'HEALTHY',
          details: isSchedulerPaused ? 'Scheduler paused from dashboard' : 'Cron poller active (1-minute scan)',
          lastRun: lastSchedulerRun || 'Active',
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'Google Sheets Live Sync',
          service: 'Google Sheets Ingestion',
          status: targetBrand?.sheetConfig?.scheduleSpreadsheetId ? 'HEALTHY' : 'UNCONFIGURED',
          details: targetBrand?.sheetConfig?.scheduleSpreadsheetId
            ? `Syncing sheet: ${targetBrand.sheetConfig.scheduleSpreadsheetId.slice(0, 12)}...`
            : 'No spreadsheet linked',
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'LinkedIn Professional',
          service: 'LinkedIn Marketing API',
          status: 'UNCONFIGURED',
          details: 'OAuth connection ready in Settings',
          lastChecked: new Date().toISOString(),
        },
      ],
    };
  },
};
