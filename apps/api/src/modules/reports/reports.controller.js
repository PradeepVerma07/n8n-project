import { reportsService } from './reports.service.js';

export const reportsController = {
  async getMetrics(req, res, next) {
    try {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const brandId = req.query.brandId;

      const metrics = await reportsService.getMetrics({
        orgId: req.orgId,
        brandId,
        days,
      });

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  },

  async getLogs(req, res, next) {
    try {
      const { brandId, platform, status, page, limit, search } = req.query;

      const result = await reportsService.getLogs({
        orgId: req.orgId,
        brandId,
        platform,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        search,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  },

  async exportCsv(req, res, next) {
    try {
      const csv = await reportsService.exportCsv({
        orgId: req.orgId,
        brandId: req.query.brandId,
      });

      const filename = `postpilot-report-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },

  async exportXlsx(req, res, next) {
    try {
      const buffer = await reportsService.exportXlsx({
        orgId: req.orgId,
        brandId: req.query.brandId,
      });

      const filename = `postpilot-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  },
};
