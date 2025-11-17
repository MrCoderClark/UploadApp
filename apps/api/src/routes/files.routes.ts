import { Router, Request, Response, NextFunction } from 'express';
import { authenticateWithApiKey } from '../middleware/auth';
import { storageService } from '../services/storage.service';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

const router = Router();

/**
 * Get signed URL for a file
 * GET /api/v1/files/:fileId/url
 */
router.get('/:fileId/url', authenticateWithApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.userId;

    // Get file from database
    const file = await prisma.upload.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new AppError('File not found', 404);
    }

    // Check if user owns the file or if file is public
    if (file.userId !== userId && !file.isPublic) {
      throw new AppError('Access denied', 403);
    }

    // Generate signed URL (expires in 1 hour)
    const signedUrl = await storageService.getSignedUrl(file.storagePath, 3600);

    res.json({
      success: true,
      data: {
        url: signedUrl,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Proxy file download (for CORS-free access)
 * GET /api/v1/files/:fileId/download
 */
router.get('/:fileId/download', authenticateWithApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.userId;

    // Get file from database
    const file = await prisma.upload.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new AppError('File not found', 404);
    }

    // Check if user owns the file or if file is public
    if (file.userId !== userId && !file.isPublic) {
      throw new AppError('Access denied', 403);
    }

    // Get file from storage
    const fileBuffer = await storageService.get(file.storagePath);

    // Set headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send file
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
