import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/password';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  isSuspended?: boolean;
  includeDeleted?: boolean;
  sortBy?: 'createdAt' | 'email' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface SuspendUserInput {
  reason: string;
  duration?: number; // in days, undefined = permanent
}

class UserManagementService {
  /**
   * List all users with pagination and filters (Admin only)
   */
  async listUsers(query: ListUsersQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      isSuspended,
      includeDeleted = false,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Convert to numbers (query params come as strings)
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    const includeDeletedBool = typeof includeDeleted === 'string' ? includeDeleted === 'true' : includeDeleted;

    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    // Only exclude deleted users if not explicitly including them
    if (!includeDeletedBool) {
      where.deletedAt = null;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isSuspended !== undefined) {
      where.isSuspended = isSuspended;
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isActive: true,
          isSuspended: true,
          suspendedReason: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          deletedAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
          _count: {
            select: {
              uploads: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get user details by ID (Admin only)
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        role: true,
        isActive: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedReason: true,
        emailVerified: true,
        verifiedAt: true,
        mfaEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        loginAttempts: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            stripeCurrentPeriodEnd: true,
            trialEndsAt: true,
          },
        },
        _count: {
          select: {
            uploads: true,
            sessions: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * Update user (Admin only)
   */
  async updateUser(userId: string, adminId: string, input: UpdateUserInput) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent admins from modifying super admins (unless they are super admin)
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (user.role === UserRole.SUPER_ADMIN && admin?.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('Only super admins can modify super admin accounts', 403);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.updated',
        resource: 'user',
        resourceId: userId,
        metadata: input as any,
      },
    });

    return updatedUser;
  }

  /**
   * Suspend user (Admin only)
   */
  async suspendUser(userId: string, adminId: string, input: SuspendUserInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isSuspended) {
      throw new AppError('User is already suspended', 400);
    }

    // Prevent admins from suspending super admins
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (user.role === UserRole.SUPER_ADMIN && admin?.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('Only super admins can suspend super admin accounts', 403);
    }

    const suspendedAt = new Date();
    const suspendedUntil = input.duration
      ? new Date(Date.now() + input.duration * 24 * 60 * 60 * 1000)
      : null;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspendedAt,
        suspendedReason: input.reason,
        metadata: {
          ...(user.metadata as any),
          suspendedUntil,
        },
      },
    });

    // Revoke all active sessions and refresh tokens
    await Promise.all([
      prisma.session.deleteMany({
        where: { userId },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.suspended',
        resource: 'user',
        resourceId: userId,
        metadata: input as any,
      },
    });

    return updatedUser;
  }

  /**
   * Unsuspend user (Admin only)
   */
  async unsuspendUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isSuspended) {
      throw new AppError('User is not suspended', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.unsuspended',
        resource: 'user',
        resourceId: userId,
      },
    });

    return updatedUser;
  }

  /**
   * Delete user (soft delete) (Admin only)
   */
  async deleteUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        uploads: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent admins from deleting super admins
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (user.role === UserRole.SUPER_ADMIN && admin?.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('Only super admins can delete super admin accounts', 403);
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Soft delete all user's uploads (makes them inaccessible)
    await prisma.upload.updateMany({
      where: { userId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Revoke all sessions and tokens
    await Promise.all([
      prisma.session.deleteMany({
        where: { userId },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.deleted',
        resource: 'user',
        resourceId: userId,
        metadata: {
          filesDeleted: user.uploads.length,
        } as any,
      },
    });

    return { 
      success: true,
      filesDeleted: user.uploads.length,
    };
  }

  /**
   * Restore deleted user (Admin only)
   */
  async restoreUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.deletedAt) {
      throw new AppError('User is not deleted', 400);
    }

    // Restore user
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });

    // Restore user's uploads
    await prisma.upload.updateMany({
      where: { 
        userId,
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.restored',
        resource: 'user',
        resourceId: userId,
      },
    });

    return { success: true };
  }

  /**
   * Reset user password (Admin only)
   */
  async resetUserPassword(userId: string, adminId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Revoke all refresh tokens to force re-login
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.password_reset',
        resource: 'user',
        resourceId: userId,
      },
    });

    return { success: true };
  }

  /**
   * Get user statistics (Admin only)
   */
  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersThisMonth,
      usersByRole,
    ] = await Promise.all([
      prisma.user.count({
        where: { deletedAt: null },
      }),
      prisma.user.count({
        where: { isActive: true, deletedAt: null },
      }),
      prisma.user.count({
        where: { isSuspended: true, deletedAt: null },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          deletedAt: null,
        },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
        where: { deletedAt: null },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersThisMonth,
      usersByRole,
    };
  }
}

export const userManagementService = new UserManagementService();
