import { Request, Response, NextFunction } from 'express';
import { userManagementService } from '../services/userManagement.service';

class UserManagementController {
  /**
   * List all users
   * GET /api/v1/admin/users
   */
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userManagementService.listUsers(req.query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/admin/users/:id
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userManagementService.getUserById(req.params.id);

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   * PUT /api/v1/admin/users/:id
   */
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userManagementService.updateUser(
        req.params.id,
        req.user!.userId,
        req.body
      );

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suspend user
   * POST /api/v1/admin/users/:id/suspend
   */
  async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userManagementService.suspendUser(
        req.params.id,
        req.user!.userId,
        req.body
      );

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unsuspend user
   * POST /api/v1/admin/users/:id/unsuspend
   */
  async unsuspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userManagementService.unsuspendUser(
        req.params.id,
        req.user!.userId
      );

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   * DELETE /api/v1/admin/users/:id
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userManagementService.deleteUser(
        req.params.id,
        req.user!.userId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore deleted user
   * POST /api/v1/admin/users/:id/restore
   */
  async restoreUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userManagementService.restoreUser(
        req.params.id,
        req.user!.userId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user password
   * POST /api/v1/admin/users/:id/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userManagementService.resetUserPassword(
        req.params.id,
        req.user!.userId,
        req.body.newPassword
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/admin/users/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await userManagementService.getUserStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userManagementController = new UserManagementController();
