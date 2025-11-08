import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { imageTransformService, TransformOptions } from '../services/imageTransform.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * Transform and serve an image with query parameters
 * GET /transform/:filename?w=300&h=200&fit=cover&format=webp&quality=80
 */
router.get('/:filename(*)', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const uploadsDir = path.resolve('./uploads');
    const filePath = path.join(uploadsDir, filename);

    // Security: Prevent path traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(uploadsDir)) {
      throw new AppError('Invalid file path', 403);
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('File not found', 404);
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new AppError('Not a file', 400);
    }

    // Parse transformation options from query params
    const options: TransformOptions = {
      width: req.query.w ? parseInt(req.query.w as string) : undefined,
      height: req.query.h ? parseInt(req.query.h as string) : undefined,
      fit: (req.query.fit as TransformOptions['fit']) || 'cover',
      format: (req.query.format as TransformOptions['format']) || undefined,
      quality: req.query.quality ? parseInt(req.query.quality as string) : 80,
      blur: req.query.blur ? parseFloat(req.query.blur as string) : undefined,
      grayscale: req.query.grayscale === 'true',
      rotate: req.query.rotate ? parseInt(req.query.rotate as string) : undefined,
    };

    // Validate options
    if (options.width && (options.width < 1 || options.width > 4000)) {
      throw new AppError('Width must be between 1 and 4000', 400);
    }
    if (options.height && (options.height < 1 || options.height > 4000)) {
      throw new AppError('Height must be between 1 and 4000', 400);
    }
    if (options.quality && (options.quality < 1 || options.quality > 100)) {
      throw new AppError('Quality must be between 1 and 100', 400);
    }

    // Check if any transformations are requested
    const hasTransformations = 
      options.width || 
      options.height || 
      options.format || 
      options.blur || 
      options.grayscale || 
      options.rotate;

    // If no transformations, serve original file
    if (!hasTransformations) {
      return res.sendFile(filePath);
    }

    // Check if it's an image
    const mimeType = getMimeType(filePath);
    if (!imageTransformService.isImage(mimeType)) {
      // Not an image, serve original
      return res.sendFile(filePath);
    }

    // Transform the image
    const transformedBuffer = await imageTransformService.transform(filePath, options);

    // Set content type
    const contentType = imageTransformService.getContentType(options.format || path.extname(filePath).slice(1));
    res.setHeader('Content-Type', contentType);

    // Set cache headers (cache for 1 year)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Send transformed image
    res.send(transformedBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * Get image metadata
 * GET /transform/metadata/:filename
 */
router.get('/metadata/:filename(*)', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const uploadsDir = path.resolve('./uploads');
    const filePath = path.join(uploadsDir, filename);

    // Security: Prevent path traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(uploadsDir)) {
      throw new AppError('Invalid file path', 403);
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('File not found', 404);
    }

    // Check if it's an image
    const mimeType = getMimeType(filePath);
    if (!imageTransformService.isImage(mimeType)) {
      throw new AppError('Not an image file', 400);
    }

    // Get metadata
    const metadata = await imageTransformService.getMetadata(filePath);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default router;
