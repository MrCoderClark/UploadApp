import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './storage.service';
import { logger } from '../utils/logger';
import { config } from '../config';

export class B2StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private endpoint: string;

  constructor() {
    this.bucketName = config.b2.bucketName;
    this.endpoint = config.b2.endpoint;

    this.s3Client = new S3Client({
      endpoint: `https://${this.endpoint}`,
      region: 'us-east-005', // B2 requires specific region format
      credentials: {
        accessKeyId: config.b2.keyId,
        secretAccessKey: config.b2.applicationKey,
      },
      forcePathStyle: true, // Required for B2
    });

    logger.info('✓ B2 Storage Provider initialized');
  }

  async save(file: Buffer, filename: string, folder?: string): Promise<string> {
    try {
      const key = folder ? `${folder}/${filename}` : filename;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: this.getContentType(filename),
      });

      await this.s3Client.send(command);
      logger.info(`File uploaded to B2: ${key}`);

      return key;
    } catch (error) {
      logger.error('B2 upload error:', error);
      throw new Error(`Failed to upload file to B2: ${error}`);
    }
  }

  async get(filepath: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filepath,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('B2 download error:', error);
      throw new Error(`Failed to download file from B2: ${error}`);
    }
  }

  async delete(filepath: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filepath,
      });

      await this.s3Client.send(command);
      logger.info(`File deleted from B2: ${filepath}`);
    } catch (error) {
      logger.error('B2 delete error:', error);
      throw new Error(`Failed to delete file from B2: ${error}`);
    }
  }

  async exists(filepath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filepath,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  getUrl(filepath: string): string {
    // For private buckets, you'll need to generate signed URLs
    // For now, return the B2 URL format
    return `https://${this.endpoint}/${this.bucketName}/${filepath}`;
  }

  async getSignedUrl(filepath: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filepath,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('B2 signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
