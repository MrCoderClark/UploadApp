import { Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';
import { AppError } from '../middleware/errorHandler';

export class OrganizationController {
  /**
   * Create organization
   * POST /api/v1/organizations
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const organization = await organizationService.createOrganization({
        ...req.body,
        userId: req.user.userId,
      });

      res.status(201).json({
        success: true,
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's organizations
   * GET /api/v1/organizations
   */
  async getUserOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const organizations = await organizationService.getUserOrganizations(req.user.userId);

      res.status(200).json({
        success: true,
        data: { organizations },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization by ID
   * GET /api/v1/organizations/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const organization = await organizationService.getOrganizationById(
        req.params.id,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization
   * PATCH /api/v1/organizations/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const organization = await organizationService.updateOrganization(
        req.params.id,
        req.user.userId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete organization
   * DELETE /api/v1/organizations/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      await organizationService.deleteOrganization(req.params.id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Organization deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization members
   * GET /api/v1/organizations/:id/members
   */
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const members = await organizationService.getOrganizationMembers(
        req.params.id,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: { members },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invite member
   * POST /api/v1/organizations/:id/members
   */
  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const member = await organizationService.inviteMember({
        organizationId: req.params.id,
        email: req.body.email,
        role: req.body.role,
        invitedBy: req.user.userId,
      });

      res.status(201).json({
        success: true,
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   * PATCH /api/v1/organizations/:id/members/:userId
   */
  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const member = await organizationService.updateMemberRole({
        organizationId: req.params.id,
        userId: req.params.userId,
        role: req.body.role,
        updatedBy: req.user.userId,
      });

      res.status(200).json({
        success: true,
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member
   * DELETE /api/v1/organizations/:id/members/:userId
   */
  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      await organizationService.removeMember(
        req.params.id,
        req.params.userId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
