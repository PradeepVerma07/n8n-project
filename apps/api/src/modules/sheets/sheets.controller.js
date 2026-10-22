import { sheetsService } from './sheets.service.js';

export const sheetsController = {
  async getConfig(req, res, next) {
    try {
      const config = await sheetsService.getConfig(req.params.brandId);
      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  },

  async saveConfig(req, res, next) {
    try {
      const config = await sheetsService.saveConfig(req.params.brandId, req.body);
      res.status(200).json({
        success: true,
        message: 'Google Sheets configuration updated successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  },

  async testConnection(req, res, next) {
    try {
      const { spreadsheetId } = req.body;
      const result = await sheetsService.testConnection(spreadsheetId);
      res.status(200).json({
        success: true,
        message: 'Google Spreadsheet connection verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async syncSheet(req, res, next) {
    try {
      const result = await sheetsService.syncSheet(req.params.brandId);
      res.status(200).json({
        success: true,
        message: 'Google Sheet synchronized successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
