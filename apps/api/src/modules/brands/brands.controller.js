import { brandsService } from './brands.service.js';

export const brandsController = {
  async getBrands(req, res, next) {
    try {
      const brands = await brandsService.getBrands(req.orgId);
      res.status(200).json({
        success: true,
        data: brands,
      });
    } catch (error) {
      next(error);
    }
  },

  async getActiveWithSheets(req, res, next) {
    try {
      const brands = await brandsService.getActiveWithSheets(req.orgId);
      res.status(200).json({
        success: true,
        data: brands,
      });
    } catch (error) {
      next(error);
    }
  },

  async getBrandById(req, res, next) {
    try {
      const brand = await brandsService.getBrandById(req.orgId, req.params.id);
      res.status(200).json({
        success: true,
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  },

  async createBrand(req, res, next) {
    try {
      const brand = await brandsService.createBrand(req.orgId, req.body);
      res.status(201).json({
        success: true,
        message: 'Brand created successfully',
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateBrand(req, res, next) {
    try {
      const brand = await brandsService.updateBrand(req.orgId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Brand updated successfully',
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteBrand(req, res, next) {
    try {
      await brandsService.deleteBrand(req.orgId, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Brand deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
