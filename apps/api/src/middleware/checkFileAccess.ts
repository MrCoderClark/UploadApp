import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import path from 'path';

/**
 * Middleware to check if a file is accessible (not deleted)
 * Blocks access to files from deleted users or soft-deleted uploads
 */
export const checkFileAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract filename from URL path
    // URL format: /uploads/filename.ext or /uploads/transform/filename.ext
    const urlPath = req.path;
    const filename = path.basename(urlPath);

    // Skip check for non-file requests (like directory listings)
    if (!filename || filename === 'uploads') {
      return next();
    }

    // Check if this file exists and is not deleted
    const upload = await prisma.upload.findFirst({
      where: {
        filename: filename,
      },
      include: {
        user: {
          select: {
            deletedAt: true,
          },
        },
      },
    });

    // If file not found in database, allow (might be a system file)
    if (!upload) {
      return next();
    }

    // Block if upload is soft-deleted
    if (upload.deletedAt) {
      return res.status(410).json({
        success: false,
        error: {
          message: 'This file has been deleted',
          code: 'FILE_DELETED',
        },
      });
    }

    // Block if user is deleted
    if (upload.user?.deletedAt) {
      return res.status(410).json({
        success: false,
        error: {
          message: 'This file is no longer available',
          code: 'USER_DELETED',
        },
      });
    }

    // File is accessible
    next();
  } catch (error) {
    // On error, allow access (fail open to avoid breaking legitimate requests)
    console.error('File access check error:', error);
    next();
  }
};
