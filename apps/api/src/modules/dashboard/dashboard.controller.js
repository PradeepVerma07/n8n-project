import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async getMetrics(req, res, next) {
    try {
      const { brandId, timeRange } = req.query;
      const data = await dashboardService.getMetrics(req.orgId, { brandId, timeRange });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getAttentionSummary(req, res, next) {
    try {
      const { brandId } = req.query;
      const data = await dashboardService.getAttentionSummary(req.orgId, { brandId });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getUpcoming(req, res, next) {
    try {
      const { brandId, limit } = req.query;
      const data = await dashboardService.getUpcoming(req.orgId, { brandId, limit: Number(limit) || 10 });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getRecentActivity(req, res, next) {
    try {
      const { brandId, limit } = req.query;
      const data = await dashboardService.getRecentActivity(req.orgId, { brandId, limit: Number(limit) || 10 });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getConnectionsHealth(req, res, next) {
    try {
      const { brandId } = req.query;
      const data = await dashboardService.getConnectionsHealth(req.orgId, { brandId });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
