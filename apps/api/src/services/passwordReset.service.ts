import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import { sendPasswordResetEmail } from '../utils/email';
import { config } from '../config';

export interface RequestPasswordResetInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export class PasswordResetService {
  /**
   * Request password reset - sends email with reset token
   */
  async requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
    const { email } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return;
    }

    // Check if user account is active
    if (user.isSuspended) {
      // Silently fail for suspended accounts
      return;
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Send password reset email
    const resetUrl = `${config.clientUrl}/auth/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl, user.firstName || 'User');

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'password_reset.requested',
        resource: 'user',
        resourceId: user.id,
        metadata: {
          email: user.email,
        },
      },
    });
  }

  /**
   * Reset password using token
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { token, newPassword } = input;

    // Find reset token
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Check if token is expired
    if (resetRecord.expiresAt < new Date()) {
      throw new AppError('Reset token has expired', 400);
    }

    // Check if token has already been used
    if (resetRecord.usedAt) {
      throw new AppError('Reset token has already been used', 400);
    }

    // Check if user account is suspended
    if (resetRecord.user.isSuspended) {
      throw new AppError('Account is suspended', 403);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: {
        password: hashedPassword,
        loginAttempts: 0, // Reset login attempts
        lockedUntil: null, // Unlock account if locked
      },
    });

    // Mark token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all existing refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { revokedAt: new Date() },
    });

    // Delete all active sessions
    await prisma.session.deleteMany({
      where: { userId: resetRecord.userId },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: resetRecord.userId,
        action: 'password_reset.completed',
        resource: 'user',
        resourceId: resetRecord.userId,
        metadata: {
          tokenId: resetRecord.id,
        },
      },
    });
  }

  /**
   * Verify if reset token is valid
   */
  async verifyResetToken(token: string): Promise<boolean> {
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return false;
    }

    // Check if expired or used
    if (resetRecord.expiresAt < new Date() || resetRecord.usedAt) {
      return false;
    }

    return true;
  }
}

export const passwordResetService = new PasswordResetService();
