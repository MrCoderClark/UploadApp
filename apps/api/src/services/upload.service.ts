import { Upload, VirusScanStatus, ProcessingStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { storageService } from './storage.service';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';
import path from 'path';
import { logger } from '../utils/logger';

export interface CreateUploadInput {
  file: Buffer;
  filename: string;
  mimeType: string;
  size: number;
  userId?: string;
  organizationId?: string;
  folder?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UploadFilters {
  userId?: string;
  organizationId?: string;
  folder?: string;
  tags?: string[];
  mimeType?: string;
}

export class UploadService {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB default
  private readonly ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Text
    'text/plain',
    'text/csv',
    'application/json',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    // Video
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ];

  /**
   * Create a new upload
   */
  async createUpload(input: CreateUploadInput): Promise<Upload> {
    // Validate file
    this.validateFile(input);

    // Calculate checksum
    const checksum = this.calculateChecksum(input.file);

    // Check for duplicate
    const existingUpload = await this.findDuplicate(checksum, input.userId, input.organizationId);
    if (existingUpload) {
      logger.info(`Duplicate file detected: ${checksum}`);
      return existingUpload;
    }

    // Determine storage folder
    const folder = input.folder || this.generateFolder(input.userId, input.organizationId);

    // Save file to storage
    const storagePath = await storageService.save(input.file, input.filename, folder);
    const url = storageService.getUrl(storagePath);

    // Get file extension
    const extension = path.extname(input.filename).substring(1);

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        filename: path.basename(storagePath),
        originalName: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        extension,
        storageProvider: 'local',
        storagePath,
        url,
        checksum,
        virusScanStatus: VirusScanStatus.PENDING,
        processingStatus: ProcessingStatus.PENDING,
        isPublic: input.isPublic || false,
        userId: input.userId,
        organizationId: input.organizationId,
        folder: input.folder,
        tags: input.tags || [],
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: 'upload.created',
        resource: 'upload',
        resourceId: upload.id,
        metadata: {
          filename: input.filename,
          size: input.size,
          mimeType: input.mimeType,
        },
      },
    });

    logger.info(`Upload created: ${upload.id} - ${input.filename}`);

    // TODO: Queue virus scan
    // TODO: Queue processing (thumbnails, etc.)

    return upload;
  }

  /**
   * Get upload by ID
   */
  async getUploadById(uploadId: string, userId?: string, organizationId?: string): Promise<Upload> {
    const where: any = { id: uploadId };

    // If not public, check ownership
    const upload = await prisma.upload.findFirst({ where });

    if (!upload) {
      throw new AppError('Upload not found', 404);
    }

    // Check access permissions
    if (!upload.isPublic) {
      if (userId && upload.userId !== userId) {
        throw new AppError('Access denied', 403);
      }
      if (organizationId && upload.organizationId !== organizationId) {
        throw new AppError('Access denied', 403);
      }
      if (!userId && !organizationId) {
        throw new AppError('Access denied', 403);
      }
    }

    return upload;
  }

  /**
   * List uploads with filters
   */
  async listUploads(
    filters: UploadFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ uploads: Upload[]; total: number; page: number; totalPages: number }> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.folder) {
      where.folder = filters.folder;
    }

    if (filters.mimeType) {
      where.mimeType = { contains: filters.mimeType };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    // Exclude soft-deleted
    where.deletedAt = null;

    const [uploads, total] = await Promise.all([
      prisma.upload.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.upload.count({ where }),
    ]);

    return {
      uploads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete upload (soft delete)
   */
  async deleteUpload(uploadId: string, userId?: string, organizationId?: string): Promise<void> {
    // Verify ownership
    const upload = await this.getUploadById(uploadId, userId, organizationId);

    // Soft delete
    await prisma.upload.update({
      where: { id: uploadId },
      data: { deletedAt: new Date() },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'upload.deleted',
        resource: 'upload',
        resourceId: uploadId,
        metadata: {
          filename: upload.originalName,
        },
      },
    });

    logger.info(`Upload soft-deleted: ${uploadId}`);
  }

  /**
   * Permanently delete upload and file
   */
  async permanentlyDeleteUpload(uploadId: string, userId?: string, organizationId?: string): Promise<void> {
    // Verify ownership
    const upload = await this.getUploadById(uploadId, userId, organizationId);

    // Delete file from storage
    try {
      await storageService.delete(upload.storagePath);
    } catch (error) {
      logger.error(`Failed to delete file from storage: ${upload.storagePath}`, error);
    }

    // Delete from database
    await prisma.upload.delete({
      where: { id: uploadId },
    });

    logger.info(`Upload permanently deleted: ${uploadId}`);
  }

  /**
   * Download upload file
   */
  async downloadUpload(uploadId: string, userId?: string, organizationId?: string): Promise<Buffer> {
    const upload = await this.getUploadById(uploadId, userId, organizationId);

    // Check if file is quarantined
    if (upload.isQuarantined) {
      throw new AppError('File is quarantined and cannot be downloaded', 403);
    }

    // Get file from storage
    const file = await storageService.get(upload.storagePath);

    return file;
  }

  /**
   * Validate file
   */
  private validateFile(input: CreateUploadInput): void {
    // Check file size
    if (input.size > this.MAX_FILE_SIZE) {
      throw new AppError(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        400
      );
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new AppError(`File type ${input.mimeType} is not allowed`, 400);
    }

    // Check filename
    if (!input.filename || input.filename.length === 0) {
      throw new AppError('Filename is required', 400);
    }

    // Check for dangerous extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'];
    const ext = path.extname(input.filename).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      throw new AppError('File extension is not allowed', 400);
    }
  }

  /**
   * Calculate file checksum (SHA-256)
   */
  private calculateChecksum(file: Buffer): string {
    return crypto.createHash('sha256').update(file).digest('hex');
  }

  /**
   * Find duplicate upload by checksum
   */
  private async findDuplicate(
    checksum: string,
    userId?: string,
    organizationId?: string
  ): Promise<Upload | null> {
    const where: any = { checksum };

    if (userId) {
      where.userId = userId;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return prisma.upload.findFirst({ where });
  }

  /**
   * Generate folder path based on user/org and date
   */
  private generateFolder(userId?: string, organizationId?: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    if (organizationId) {
      return `organizations/${organizationId}/${year}/${month}`;
    }

    if (userId) {
      return `users/${userId}/${year}/${month}`;
    }

    return `public/${year}/${month}`;
  }
}

export const uploadService = new UploadService();
