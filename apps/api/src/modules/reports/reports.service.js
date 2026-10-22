import ExcelJS from 'exceljs';
import { prisma } from '../../config/prisma.js';

function isDbConnectionError(err) {
  return (
    err?.message?.includes("Can't reach database server") ||
    err?.message?.includes('database server is running') ||
    err?.code === 'P1001'
  );
}

export const reportsService = {
  /**
   * Calculates aggregated performance metrics, time-series data, and breakdowns for dashboard charts.
   *
   * @param {object} params
   * @param {string} params.orgId
   * @param {string} [params.brandId]
   * @param {number} [params.days=30]
   * @returns {Promise<object>}
   */
  async getMetrics({ orgId, brandId, days = 30 }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where = {
      createdAt: { gte: startDate },
      brand: { orgId },
    };

    if (brandId) {
      where.brandId = brandId;
    }

    let reports = [];
    try {
      reports = await prisma.report.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: { brand: true },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        reports = [];
      } else {
        throw err;
      }
    }

    const total = reports.length;
    let successCount = 0;
    let failedCount = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    const timeSeriesMap = new Map();
    const platformMap = new Map();
    const errorMap = new Map();

    for (const r of reports) {
      const isSuccess = r.status === 'SUCCESS';
      if (isSuccess) successCount++;
      else failedCount++;

      if (r.latencySeconds) {
        totalLatency += r.latencySeconds;
        latencyCount++;
      }

      // 1. Time-series aggregation (YYYY-MM-DD)
      const dateKey = new Date(r.createdAt).toISOString().split('T')[0];
      if (!timeSeriesMap.has(dateKey)) {
        timeSeriesMap.set(dateKey, { date: dateKey, success: 0, failed: 0, total: 0 });
      }
      const dayData = timeSeriesMap.get(dateKey);
      dayData.total++;
      if (isSuccess) dayData.success++;
      else dayData.failed++;

      // 2. Platform performance aggregation
      const pKey = r.platform;
      if (!platformMap.has(pKey)) {
        platformMap.set(pKey, {
          platform: pKey,
          success: 0,
          failed: 0,
          total: 0,
          totalLatency: 0,
          latencySamples: 0,
        });
      }
      const pData = platformMap.get(pKey);
      pData.total++;
      if (isSuccess) pData.success++;
      else pData.failed++;
      if (r.latencySeconds) {
        pData.totalLatency += r.latencySeconds;
        pData.latencySamples++;
      }

      // 3. Error code breakdown
      if (!isSuccess && r.errorCode) {
        errorMap.set(r.errorCode, (errorMap.get(r.errorCode) || 0) + 1);
      }
    }

    const successRate = total > 0 ? parseFloat(((successCount / total) * 100).toFixed(1)) : 100;
    const avgLatency = latencyCount > 0 ? parseFloat((totalLatency / latencyCount).toFixed(1)) : 0;

    const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const platformBreakdown = Array.from(platformMap.values()).map((p) => ({
      platform: p.platform,
      total: p.total,
      success: p.success,
      failed: p.failed,
      successRate: p.total > 0 ? parseFloat(((p.success / p.total) * 100).toFixed(1)) : 100,
      avgLatency: p.latencySamples > 0 ? parseFloat((p.totalLatency / p.latencySamples).toFixed(1)) : 0,
    }));

    const errorBreakdown = Array.from(errorMap.entries()).map(([code, count]) => ({
      name: code,
      count,
    }));

    return {
      kpis: {
        totalPublications: total,
        successCount,
        failedCount,
        successRate,
        avgLatencySeconds: avgLatency,
        activePlatformsCount: platformMap.size,
      },
      timeSeries,
      platformBreakdown,
      errorBreakdown,
    };
  },

  /**
   * Retrieves paginated execution log records with filtering.
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async getLogs({ orgId, brandId, platform, status, page = 1, limit = 20, search }) {
    const skip = (page - 1) * limit;
    const where = {
      brand: { orgId },
    };

    if (brandId) where.brandId = brandId;
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { customId: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
      ];
    }

    let total = 0;
    let reports = [];
    try {
      [total, reports] = await Promise.all([
        prisma.report.count({ where }),
        prisma.report.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { brand: true, post: true },
        }),
      ]);
    } catch (err) {
      if (isDbConnectionError(err)) {
        total = 0;
        reports = [];
      } else {
        throw err;
      }
    }

    return {
      data: reports,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Generates CSV string adhering strictly to the Google Sheets Report Sheet data contract.
   *
   * @param {object} params
   * @returns {Promise<string>}
   */
  async exportCsv({ orgId, brandId }) {
    const where = { brand: { orgId } };
    if (brandId) where.brandId = brandId;

    let reports = [];
    try {
      reports = await prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        reports = [];
      } else {
        throw err;
      }
    }

    const headers = [
      'report_id',
      'post_id',
      'brand_id',
      'client_name',
      'topic',
      'platform',
      'post_type',
      'scheduled_local',
      'timezone',
      'scheduled_utc',
      'attempted_at_utc',
      'published_at_utc',
      'status',
      'attempts',
      'platform_post_id',
      'platform_post_url',
      'error_code',
      'error_message',
      'latency_seconds',
    ];

    const rows = [headers.join(',')];

    for (const r of reports) {
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const row = [
        escape(r.id),
        escape(r.customId),
        escape(r.brandId),
        escape(r.clientName),
        escape(r.topic),
        escape(r.platform),
        escape(r.postType),
        escape(r.scheduledLocal?.toISOString()),
        escape(r.timezone),
        escape(r.scheduledUtc?.toISOString()),
        escape(r.attemptedAtUtc?.toISOString()),
        escape(r.publishedAtUtc?.toISOString()),
        escape(r.status),
        r.attempts,
        escape(r.platformPostId),
        escape(r.platformPostUrl),
        escape(r.errorCode),
        escape(r.errorMessage),
        r.latencySeconds || 0,
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  },

  /**
   * Generates a multi-tab Excel (.xlsx) workbook using exceljs.
   * Tab 1: Raw Report Records (matching Report Sheet contract)
   * Tab 2: Summary (daily totals per brand and platform)
   *
   * @param {object} params
   * @returns {Promise<Buffer>}
   */
  async exportXlsx({ orgId, brandId }) {
    const where = { brand: { orgId } };
    if (brandId) where.brandId = brandId;

    let reports = [];
    try {
      reports = await prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { brand: true },
      });
    } catch (err) {
      if (isDbConnectionError(err)) {
        reports = [];
      } else {
        throw err;
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PostPilot Enterprise';
    workbook.created = new Date();

    // Tab 1: Raw Execution Reports
    const now = new Date();
    const tabName = `Report_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    const reportSheet = workbook.addWorksheet(tabName);

    reportSheet.columns = [
      { header: 'Report ID', key: 'id', width: 36 },
      { header: 'Post ID', key: 'customId', width: 18 },
      { header: 'Brand ID', key: 'brandId', width: 24 },
      { header: 'Client Name', key: 'clientName', width: 20 },
      { header: 'Topic', key: 'topic', width: 24 },
      { header: 'Platform', key: 'platform', width: 14 },
      { header: 'Post Type', key: 'postType', width: 12 },
      { header: 'Scheduled Local', key: 'scheduledLocal', width: 22 },
      { header: 'Timezone', key: 'timezone', width: 18 },
      { header: 'Scheduled UTC', key: 'scheduledUtc', width: 22 },
      { header: 'Attempted At UTC', key: 'attemptedAtUtc', width: 22 },
      { header: 'Published At UTC', key: 'publishedAtUtc', width: 22 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Attempts', key: 'attempts', width: 10 },
      { header: 'Platform Post ID', key: 'platformPostId', width: 24 },
      { header: 'Platform URL', key: 'platformPostUrl', width: 36 },
      { header: 'Error Code', key: 'errorCode', width: 18 },
      { header: 'Error Message', key: 'errorMessage', width: 32 },
      { header: 'Latency (s)', key: 'latencySeconds', width: 12 },
    ];

    // Style Header Row
    const headerRow = reportSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Slate 800
    };

    for (const r of reports) {
      reportSheet.addRow({
        id: r.id,
        customId: r.customId,
        brandId: r.brandId,
        clientName: r.clientName,
        topic: r.topic || '',
        platform: r.platform,
        postType: r.postType,
        scheduledLocal: r.scheduledLocal ? new Date(r.scheduledLocal).toISOString() : '',
        timezone: r.timezone,
        scheduledUtc: r.scheduledUtc ? new Date(r.scheduledUtc).toISOString() : '',
        attemptedAtUtc: r.attemptedAtUtc ? new Date(r.attemptedAtUtc).toISOString() : '',
        publishedAtUtc: r.publishedAtUtc ? new Date(r.publishedAtUtc).toISOString() : '',
        status: r.status,
        attempts: r.attempts,
        platformPostId: r.platformPostId || '',
        platformPostUrl: r.platformPostUrl || '',
        errorCode: r.errorCode || '',
        errorMessage: r.errorMessage || '',
        latencySeconds: r.latencySeconds || 0,
      });
    }

    // Tab 2: Aggregated Summary
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Brand Name', key: 'brandName', width: 24 },
      { header: 'Platform', key: 'platform', width: 16 },
      { header: 'Total Attempts', key: 'total', width: 16 },
      { header: 'Success Count', key: 'success', width: 16 },
      { header: 'Failure Count', key: 'failed', width: 16 },
      { header: 'Success Rate (%)', key: 'rate', width: 18 },
      { header: 'Avg Latency (s)', key: 'latency', width: 16 },
    ];

    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' }, // Indigo 700
    };

    // Calculate Summary groupings
    const summaryMap = new Map();
    for (const r of reports) {
      const key = `${r.clientName}::${r.platform}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          brandName: r.clientName,
          platform: r.platform,
          total: 0,
          success: 0,
          failed: 0,
          totalLatency: 0,
        });
      }
      const s = summaryMap.get(key);
      s.total++;
      if (r.status === 'SUCCESS') s.success++;
      else s.failed++;
      s.totalLatency += r.latencySeconds || 0;
    }

    for (const s of summaryMap.values()) {
      summarySheet.addRow({
        brandName: s.brandName,
        platform: s.platform,
        total: s.total,
        success: s.success,
        failed: s.failed,
        rate: `${((s.success / s.total) * 100).toFixed(1)}%`,
        latency: (s.totalLatency / s.total).toFixed(1),
      });
    }

    return workbook.xlsx.writeBuffer();
  },
};
