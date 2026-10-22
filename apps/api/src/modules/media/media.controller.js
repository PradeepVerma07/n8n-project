import { mediaService } from './media.service.js';

export const mediaController = {
  async uploadFile(req, res, next) {
    try {
      const asset = await mediaService.processAndUpload(req.orgId, req.file);
      res.status(201).json({
        success: true,
        message: 'Media uploaded and processed successfully',
        data: asset,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPresignedUrl(req, res, next) {
    try {
      const { filename, mimeType, fileSize } = req.body;
      const result = await mediaService.generatePresignedUploadUrl(req.orgId, {
        filename,
        mimeType,
        fileSize,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async confirmUpload(req, res, next) {
    try {
      const asset = await mediaService.confirmDirectUpload(req.orgId, req.body);
      res.status(201).json({
        success: true,
        message: 'Upload confirmed and asset registered',
        data: asset,
      });
    } catch (error) {
      next(error);
    }
  },

  async listMedia(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const type = req.query.type; // "image" | "video"
      const search = req.query.search;

      const result = await mediaService.listMedia(req.orgId, { page, limit, type, search });
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMediaById(req, res, next) {
    try {
      const platforms = req.query.platforms ? req.query.platforms.split(',') : [];
      const asset = await mediaService.getMediaById(req.orgId, req.params.id, platforms);
      res.status(200).json({
        success: true,
        data: asset,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteMedia(req, res, next) {
    try {
      await mediaService.deleteMedia(req.orgId, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Media asset deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async validateMedia(req, res, next) {
    try {
      const { asset, platforms } = req.body;
      const validation = mediaService.validateMediaSpecs(asset, platforms);
      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      next(error);
    }
  },
};
