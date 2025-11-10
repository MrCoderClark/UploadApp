import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { authenticate, authenticateWithApiKey } from '../middleware/auth';
import { directUploadService } from '../services/directUpload.service';
import { subscriptionService } from '../services/subscription.service';
import { webhookService } from '../services/webhook.service';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

const router = Router();

/**
 * Step 1: Request a pre-signed upload URL
 * POST /api/v1/direct-upload/prepare
 */
router.post('/prepare', authenticateWithApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, mimeType, fileSize } = req.body;
    const userId = req.user!.userId;

    // Validate input
    if (!filename || !mimeType || !fileSize) {
      throw new AppError('Missing required fields: filename, mimeType, fileSize', 400);
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      throw new AppError('Invalid file size', 400);
    }

    // Check subscription limits
    const canUpload = await subscriptionService.canUpload(userId, fileSize);
    if (!canUpload.allowed) {
      throw new AppError(canUpload.reason || 'Upload not allowed', 403);
    }

    // Generate upload token
    const uploadData = await directUploadService.generateUploadToken({
      filename,
      mimeType,
      fileSize,
      userId,
    });

    res.json({
      success: true,
      data: {
        uploadId: uploadData.uploadId,
        uploadUrl: uploadData.uploadUrl,
        token: uploadData.token,
        expiresAt: uploadData.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Step 2: Upload file directly using the pre-signed URL
 * PUT /api/v1/direct-upload/:uploadId
 */
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

router.put('/:uploadId', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uploadId } = req.params;
    const token = req.headers['x-upload-token'] as string;

    if (!token) {
      throw new AppError('Missing upload token', 401);
    }

    // Validate token
    const uploadToken = directUploadService.validateToken(token);
    if (!uploadToken || uploadToken.uploadId !== uploadId) {
      throw new AppError('Invalid or expired upload token', 401);
    }

    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    // Validate file size
    if (req.file.size > uploadToken.maxFileSize) {
      throw new AppError('File size exceeds allowed limit', 400);
    }

    // Validate MIME type
    if (uploadToken.allowedMimeTypes && !uploadToken.allowedMimeTypes.includes(req.file.mimetype)) {
      throw new AppError('File type not allowed', 400);
    }

    // Get user from token
    const userId = uploadToken.userId;

    // Generate file path
    const filePath = directUploadService.generateFilePath(userId, uploadToken.filename);
    const fullPath = path.join('./uploads', filePath);

    // Ensure directory exists
    await directUploadService.ensureDirectory(fullPath);

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    // Save file
    await fs.promises.writeFile(fullPath, req.file.buffer);

    // Consume token
    directUploadService.consumeToken(token);

    // Create upload record in database
    const uploadRecord = await prisma.upload.create({
      data: {
        userId,
        filename: path.basename(filePath),
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        extension: path.extname(req.file.originalname),
        storageProvider: 'local',
        storagePath: filePath,
        url: `/uploads/${filePath}`,
        checksum,
        virusScanStatus: 'PENDING',
        processingStatus: 'PENDING',
        isPublic: false,
        tags: [],
      },
    });

    // Track usage
    await subscriptionService.trackUpload(userId, req.file.size, uploadRecord.id);

    // Trigger webhook event
    await webhookService.triggerEvent({
      event: 'upload.completed',
      userId,
      data: {
        upload: {
          id: uploadRecord.id,
          filename: uploadRecord.filename,
          originalName: uploadRecord.originalName,
          mimeType: uploadRecord.mimeType,
          size: uploadRecord.size,
          url: uploadRecord.url,
          uploadedAt: uploadRecord.uploadedAt,
        },
      },
    });

    res.json({
      success: true,
      data: {
        upload: {
          id: uploadRecord.id,
          filename: uploadRecord.filename,
          originalName: uploadRecord.originalName,
          mimeType: uploadRecord.mimeType,
          size: uploadRecord.size,
          url: uploadRecord.url,
          uploadedAt: uploadRecord.uploadedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Step 3: Complete upload (optional callback for additional processing)
 * POST /api/v1/direct-upload/:uploadId/complete
 */
router.post('/:uploadId/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user!.userId;

    // Find the upload
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId,
      },
    });

    if (!upload) {
      throw new AppError('Upload not found', 404);
    }

    // Mark as completed (if you have a status field)
    // You can trigger additional processing here (thumbnails, virus scan, etc.)

    res.json({
      success: true,
      data: {
        upload: {
          id: upload.id,
          filename: upload.filename,
          url: upload.url,
          status: 'completed',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
