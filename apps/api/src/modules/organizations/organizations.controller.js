import { organizationsService } from './organizations.service.js';

export const organizationsController = {
  async getMyOrganization(req, res, next) {
    try {
      const org = await organizationsService.getOrganization(req.orgId);
      res.status(200).json({
        success: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMembers(req, res, next) {
    try {
      const org = await organizationsService.getOrganization(req.orgId);
      res.status(200).json({
        success: true,
        data: org?.memberships || [],
      });
    } catch (error) {
      next(error);
    }
  },

  async updateMyOrganization(req, res, next) {
    try {
      const updated = await organizationsService.updateOrganization(req.orgId, req.body);
      res.status(200).json({
        success: true,
        message: 'Organization updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateMemberRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const updated = await organizationsService.updateMemberRole(req.orgId, userId, role);
      res.status(200).json({
        success: true,
        message: 'Member role updated',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateMember(req, res, next) {
    try {
      const { userId } = req.params;
      const updated = await organizationsService.updateMember(req.orgId, userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Employee details updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async removeMember(req, res, next) {
    try {
      const { userId } = req.params;
      await organizationsService.removeMember(req.orgId, userId);
      res.status(200).json({
        success: true,
        message: 'Member removed from organization',
      });
    } catch (error) {
      next(error);
    }
  },

  async createMember(req, res, next) {
    try {
      const newMember = await organizationsService.createMember(req.orgId, req.body);
      res.status(201).json({
        success: true,
        message: 'Employee added successfully',
        data: newMember,
      });
    } catch (error) {
      next(error);
    }
  },
};
