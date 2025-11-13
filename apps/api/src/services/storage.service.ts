import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface StorageProvider {
  save(file: Buffer, filename: string, folder?: string): Promise<string>;
  get(filepath: string): Promise<Buffer>;
  delete(filepath: string): Promise<void>;
  exists(filepath: string): Promise<boolean>;
  getUrl(filepath: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private baseUrl: string;

  constructor(baseDir: string = './uploads', baseUrl: string = '/uploads') {
    // Use /tmp in serverless environments (Vercel)
    if (process.env.VERCEL === '1') {
      this.baseDir = '/tmp/uploads';
      logger.warn('⚠️ Running in serverless mode - using /tmp for uploads (files will be ephemeral)');
    } else {
      this.baseDir = path.resolve(baseDir);
    }
    this.baseUrl = baseUrl;
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.baseDir);
    } catch {
      await fs.mkdir(this.baseDir, { recursive: true });
      logger.info(`Created upload directory: ${this.baseDir}`);
    }
  }

  async save(file: Buffer, filename: string, folder?: string): Promise<string> {
    try {
      // Create folder path if provided
      const folderPath = folder ? path.join(this.baseDir, folder) : this.baseDir;
      
      // Ensure folder exists
      await fs.mkdir(folderPath, { recursive: true });

      // Generate unique filename to prevent collisions
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      const uniqueFilename = `${basename}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      
      const filepath = folder 
        ? path.join(folder, uniqueFilename)
        : uniqueFilename;

      const fullPath = path.join(this.baseDir, filepath);

      // Write file
      await fs.writeFile(fullPath, file);

      logger.info(`File saved: ${filepath}`);
      return filepath;
    } catch (error) {
      logger.error('Error saving file:', error);
      throw new AppError('Failed to save file', 500);
    }
  }

  async get(filepath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.baseDir, filepath);
      const file = await fs.readFile(fullPath);
      return file;
    } catch (error) {
      logger.error('Error reading file:', error);
      throw new AppError('File not found', 404);
    }
  }

  async delete(filepath: string): Promise<void> {
    try {
      const fullPath = path.join(this.baseDir, filepath);
      await fs.unlink(fullPath);
      logger.info(`File deleted: ${filepath}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new AppError('Failed to delete file', 500);
    }
  }

  async exists(filepath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, filepath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filepath: string): string {
    return `${this.baseUrl}/${filepath}`;
  }
}

// Storage service singleton
class StorageService {
  private provider: StorageProvider;

  constructor() {
    // Default to local storage
    // Can be extended to support S3, GCS, Azure, etc.
    this.provider = new LocalStorageProvider();
  }

  setProvider(provider: StorageProvider): void {
    this.provider = provider;
  }

  async save(file: Buffer, filename: string, folder?: string): Promise<string> {
    return this.provider.save(file, filename, folder);
  }

  async get(filepath: string): Promise<Buffer> {
    return this.provider.get(filepath);
  }

  async delete(filepath: string): Promise<void> {
    return this.provider.delete(filepath);
  }

  async exists(filepath: string): Promise<boolean> {
    return this.provider.exists(filepath);
  }

  getUrl(filepath: string): string {
    return this.provider.getUrl(filepath);
  }
}

export const storageService = new StorageService();
