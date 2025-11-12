import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, isActive: true, isSuspended: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive || user.isSuspended) {
      throw new AppError('Account is not active', 403);
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is a super admin
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, isActive: true, isSuspended: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive || user.isSuspended) {
      throw new AppError('Account is not active', 403);
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('Super admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
