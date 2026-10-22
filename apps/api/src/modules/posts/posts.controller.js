import { postsService } from './posts.service.js';
import { postsRepository } from './posts.repository.js';

export const postsController = {
  async createPost(req, res, next) {
    try {
      const post = await postsService.createPost(req.orgId, req.user?.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  async listPosts(req, res, next) {
    try {
      const { brandId, status, startDate, endDate, search, page, limit } = req.query;
      const result = await postsRepository.findAll(req.orgId, {
        brandId,
        status,
        startDate,
        endDate,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPostById(req, res, next) {
    try {
      const post = await postsRepository.findById(req.params.id);
      if (!post || post.brand.orgId !== req.orgId) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }
      res.status(200).json({
        success: true,
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  async updatePost(req, res, next) {
    try {
      const post = await postsService.updatePost(req.orgId, req.user?.id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  async duplicatePost(req, res, next) {
    try {
      const post = await postsService.duplicatePost(req.orgId, req.user?.id, req.params.id);
      res.status(201).json({
        success: true,
        message: 'Post duplicated as new draft',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  async deletePost(req, res, next) {
    try {
      await postsService.deletePost(req.orgId, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async submitApproval(req, res, next) {
    try {
      const post = await postsService.submitForApproval(req.orgId, req.user?.id, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Post submitted for approval',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  async approvePost(req, res, next) {
    try {
      const post = await postsService.approvePost(req.orgId, req.user?.id, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Post approved and scheduled',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectPost(req, res, next) {
    try {
      const { rejectionReason } = req.body;
      const post = await postsService.rejectPost(
        req.orgId,
        req.user?.id,
        req.params.id,
        rejectionReason
      );
      res.status(200).json({
        success: true,
        message: 'Post rejected and returned to draft',
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCalendar(req, res, next) {
    try {
      const { brandId, startUtc, endUtc } = req.query;
      const posts = await postsService.getCalendarPosts(req.orgId, { brandId, startUtc, endUtc });
      res.status(200).json({
        success: true,
        data: posts,
      });
    } catch (error) {
      next(error);
    }
  },

  async bulkImport(req, res, next) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Upload a CSV or XLSX file' });
      }

      const isXlsx = req.file.originalname.endsWith('.xlsx');
      const result = await postsService.bulkImport(
        req.orgId,
        req.user?.id,
        req.file.buffer,
        isXlsx ? 'xlsx' : 'csv'
      );

      res.status(200).json({
        success: true,
        message: `Imported ${result.imported} out of ${result.total} rows`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
