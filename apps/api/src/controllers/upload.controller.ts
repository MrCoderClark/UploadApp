import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { AppError } from '../middleware/errorHandler';

export class UploadController {
  /**
   * Upload file
   * POST /api/v1/uploads
   */
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) {
        throw new AppError('No file uploaded', 400);
      }

      const upload = await uploadService.createUpload({
        file: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        userId: req.user?.userId || req.apiKey?.userId || undefined,
        organizationId: req.body.organizationId || req.apiKey?.organizationId || undefined,
        folder: req.body.folder,
        tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
        isPublic: req.body.isPublic === 'true',
      });

      res.status(201).json({
        success: true,
        data: { upload },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get uploads list
   * GET /api/v1/uploads
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = {
        userId: req.user?.userId || req.apiKey?.userId || undefined,
        organizationId: req.query.organizationId as string,
        folder: req.query.folder as string,
        mimeType: req.query.mimeType as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      };

      const result = await uploadService.listUploads(filters, page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upload by ID
   * GET /api/v1/uploads/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const upload = await uploadService.getUploadById(
        req.params.id,
        req.user?.userId || req.apiKey?.userId || undefined,
        req.query.organizationId as string
      );

      res.status(200).json({
        success: true,
        data: { upload },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download file
   * GET /api/v1/uploads/:id/download
   */
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const upload = await uploadService.getUploadById(
        req.params.id,
        req.user?.userId || req.apiKey?.userId || undefined,
        req.query.organizationId as string
      );

      const file = await uploadService.downloadUpload(
        req.params.id,
        req.user?.userId || req.apiKey?.userId || undefined,
        req.query.organizationId as string
      );

      res.setHeader('Content-Type', upload.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${upload.originalName}"`);
      res.setHeader('Content-Length', upload.size);

      res.send(file);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete upload
   * DELETE /api/v1/uploads/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await uploadService.deleteUpload(
        req.params.id,
        req.user?.userId || req.apiKey?.userId || undefined,
        req.query.organizationId as string
      );

      res.status(200).json({
        success: true,
        message: 'Upload deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
