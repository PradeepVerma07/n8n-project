import { brandsRepository } from './brands.repository.js';
import { postsRepository } from '../posts/posts.repository.js';
import { publishService } from '../publish/publish.service.js';
import { AppError } from '../../middlewares/error.middleware.js';

export const brandsService = {
  async getBrands(orgId) {
    return brandsRepository.findAll(orgId);
  },

  async getActiveWithSheets(orgId) {
    const brands = await brandsRepository.findActiveWithSheets(orgId);
    const isPaused = publishService.isSchedulerPaused();

    return Promise.all(
      brands.map(async (brand) => {
        // If the scheduler is paused from the frontend, return 0 due posts so n8n doesn't auto-publish
        const duePosts = isPaused ? [] : await postsRepository.findDuePosts(brand.id);
        const formattedDue = (duePosts || []).map((p) => ({
          postId: p.customId,
          post_id: p.customId,
          topic: p.topic || '',
          caption: p.caption || '',
          hashtags: p.hashtags || '',
          firstComment: p.firstComment || '',
          linkUrl: p.linkUrl || '',
          postType: p.postType || 'IMAGE',
          mediaUrls: p.mediaUrls || [],
          scheduledDate: p.scheduledDate || (p.scheduledUtc ? new Date(p.scheduledUtc).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
          scheduledTime: p.scheduledTime || (p.scheduledUtc ? new Date(p.scheduledUtc).toISOString().slice(11, 16) : '12:00'),
          timezone: p.timezone || brand.defaultTimezone || 'America/New_York',
          platforms: (p.platforms || []).map((pl) => pl.platform || pl),
          status: p.status,
        }));
        return {
          ...brand,
          duePosts: formattedDue,
          dueRows: formattedDue,
        };
      })
    );
  },

  async getBrandById(orgId, brandId) {
    const brand = await brandsRepository.findById(orgId, brandId);
    if (!brand) {
      throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
    }
    return brand;
  },

  async createBrand(orgId, data) {
    // Generate slug from name if not provided
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return brandsRepository.create(orgId, {
      ...data,
      slug,
    });
  },

  async updateBrand(orgId, brandId, data) {
    const existing = await brandsRepository.findById(orgId, brandId);
    if (!existing) {
      throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
    }
    return brandsRepository.update(orgId, brandId, data);
  },

  async deleteBrand(orgId, brandId) {
    const existing = await brandsRepository.findById(orgId, brandId);
    if (!existing) {
      throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
    }
    await brandsRepository.delete(orgId, brandId);
    return { success: true };
  },
};
