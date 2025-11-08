import { Request, Response, NextFunction } from 'express';
import { passwordResetService } from '../services/passwordReset.service';

export class PasswordResetController {
  /**
   * Request password reset
   * POST /api/v1/auth/password-reset/request
   */
  async requestReset(req: Request, res: Response, next: NextFunction) {
    try {
      await passwordResetService.requestPasswordReset(req.body);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   * POST /api/v1/auth/password-reset/reset
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await passwordResetService.resetPassword(req.body);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify reset token validity
   * GET /api/v1/auth/password-reset/verify/:token
   */
  async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const isValid = await passwordResetService.verifyResetToken(token);

      res.status(200).json({
        success: true,
        data: { valid: isValid },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const passwordResetController = new PasswordResetController();
