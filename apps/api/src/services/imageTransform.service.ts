import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface TransformOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';
  quality?: number;
  blur?: number;
  grayscale?: boolean;
  rotate?: number;
}

export class ImageTransformService {
  /**
   * Transform an image based on the provided options
   */
  async transform(inputPath: string, options: TransformOptions): Promise<Buffer> {
    try {
      let pipeline = sharp(inputPath);

      // Resize
      if (options.width || options.height) {
        pipeline = pipeline.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'cover',
          withoutEnlargement: true, // Don't upscale images
        });
      }

      // Rotate
      if (options.rotate) {
        pipeline = pipeline.rotate(options.rotate);
      }

      // Blur
      if (options.blur && options.blur > 0) {
        pipeline = pipeline.blur(Math.min(options.blur, 100));
      }

      // Grayscale
      if (options.grayscale) {
        pipeline = pipeline.grayscale();
      }

      // Format conversion and quality
      const format = options.format || 'jpeg';
      const quality = options.quality || 80;

      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality });
          break;
        case 'gif':
          pipeline = pipeline.gif();
          break;
      }

      return await pipeline.toBuffer();
    } catch (error) {
      throw new Error(`Image transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(inputPath: string) {
    try {
      const metadata = await sharp(inputPath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Get content type for format
   */
  getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      gif: 'image/gif',
    };
    return contentTypes[format] || 'image/jpeg';
  }

  /**
   * Generate cache key for transformed image
   */
  generateCacheKey(filePath: string, options: TransformOptions): string {
    const optionsStr = JSON.stringify(options);
    const hash = Buffer.from(optionsStr).toString('base64url');
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    return `${basename}_${hash}.${options.format || 'jpg'}`;
  }
}

export const imageTransformService = new ImageTransformService();
