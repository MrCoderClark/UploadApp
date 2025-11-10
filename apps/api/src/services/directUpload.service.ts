import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export interface UploadToken {
  token: string;
  uploadId: string;
  expiresAt: Date;
  maxFileSize: number;
  allowedMimeTypes?: string[];
  userId: string;
  filename: string;
}

export interface DirectUploadParams {
  filename: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  organizationId?: string;
}

export class DirectUploadService {
  private uploadTokens: Map<string, UploadToken> = new Map();
  private readonly TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Generate a pre-signed upload token
   */
  async generateUploadToken(params: DirectUploadParams): Promise<{
    uploadId: string;
    token: string;
    uploadUrl: string;
    expiresAt: Date;
  }> {
    // Validate file size
    if (params.fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    // Generate unique upload ID
    const uploadId = crypto.randomUUID();
    
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS);

    // Store token
    this.uploadTokens.set(token, {
      token,
      uploadId,
      expiresAt,
      maxFileSize: params.fileSize,
      allowedMimeTypes: [params.mimeType],
      userId: params.userId,
      filename: params.filename,
    });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    // Generate upload URL (relative to API base, not full path)
    const uploadUrl = `/direct-upload/${uploadId}`;

    return {
      uploadId,
      token,
      uploadUrl,
      expiresAt,
    };
  }

  /**
   * Validate upload token
   */
  validateToken(token: string): UploadToken | null {
    const uploadToken = this.uploadTokens.get(token);
    
    if (!uploadToken) {
      return null;
    }

    // Check if expired
    if (new Date() > uploadToken.expiresAt) {
      this.uploadTokens.delete(token);
      return null;
    }

    return uploadToken;
  }

  /**
   * Consume (invalidate) a token after successful upload
   */
  consumeToken(token: string): void {
    this.uploadTokens.delete(token);
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, uploadToken] of this.uploadTokens.entries()) {
      if (now > uploadToken.expiresAt) {
        this.uploadTokens.delete(token);
      }
    }
  }

  /**
   * Generate file path for upload
   */
  generateFilePath(userId: string, filename: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const uniqueFilename = `${baseName}-${timestamp}-${randomStr}${ext}`;

    return path.join('users', userId, year.toString(), month, uniqueFilename);
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }
}

export const directUploadService = new DirectUploadService();
