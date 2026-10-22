import { organizationsRepository } from './organizations.repository.js';
import { AppError } from '../../middlewares/error.middleware.js';

export const organizationsService = {
  async getOrganization(orgId) {
    const org = await organizationsRepository.findById(orgId);
    if (!org) {
      throw new AppError('Organization not found', 404, 'ORG_NOT_FOUND');
    }
    return org;
  },

  async updateOrganization(orgId, data) {
    return organizationsRepository.update(orgId, data);
  },

  async updateMemberRole(orgId, targetUserId, newRole) {
    return organizationsRepository.updateMemberRole(orgId, targetUserId, newRole);
  },

  async updateMember(orgId, targetUserId, data) {
    return organizationsRepository.updateMember(orgId, targetUserId, data);
  },

  async removeMember(orgId, targetUserId) {
    return organizationsRepository.removeMember(orgId, targetUserId);
  },

  async createMember(orgId, memberData) {
    return organizationsRepository.createEmployee(orgId, memberData);
  },
};
