import axios, { AxiosInstance, AxiosProgressEvent } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import {
  UploadMeConfig,
  UploadedFile,
  UploadProgress,
  UploadOptions,
  PrepareUploadResponse,
  ListFilesOptions,
  ListFilesResponse,
  ApiResponse,
} from './types';

/**
 * UploadMe Node.js Client
 * Server-side SDK for file uploads and management
 */
export class UploadMeClient {
  private apiKey: string;
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(config: UploadMeConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.uploadme.com/api/v1';

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  /**
   * Upload a file from file path
   */
  async uploadFile(
    filePath: string,
    options?: UploadOptions
  ): Promise<UploadedFile> {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);

    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    return this.uploadBuffer(fileBuffer, filename, options);
  }

  /**
   * Upload a file from buffer
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options?: UploadOptions
  ): Promise<UploadedFile> {
    // Step 1: Prepare upload
    const prepareData = await this.prepareUpload({
      filename,
      mimeType: this.getMimeType(filename),
      fileSize: buffer.length,
    });

    // Step 2: Upload file
    const formData = new FormData();
    formData.append('file', buffer, filename);

    const response = await this.client.put<ApiResponse<{ upload: UploadedFile }>>(
      prepareData.uploadUrl,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'X-Upload-Token': prepareData.token,
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (options?.onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage,
            });
          }
        },
      }
    );

    return response.data.data.upload;
  }

  /**
   * Upload a file from stream
   */
  async uploadStream(
    stream: NodeJS.ReadableStream,
    filename: string,
    fileSize: number,
    options?: UploadOptions
  ): Promise<UploadedFile> {
    // Step 1: Prepare upload
    const prepareData = await this.prepareUpload({
      filename,
      mimeType: this.getMimeType(filename),
      fileSize,
    });

    // Step 2: Upload file
    const formData = new FormData();
    formData.append('file', stream, filename);

    const response = await this.client.put<ApiResponse<{ upload: UploadedFile }>>(
      prepareData.uploadUrl,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'X-Upload-Token': prepareData.token,
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (options?.onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage,
            });
          }
        },
      }
    );

    return response.data.data.upload;
  }

  /**
   * Prepare upload - get pre-signed URL
   */
  private async prepareUpload(data: {
    filename: string;
    mimeType: string;
    fileSize: number;
  }): Promise<PrepareUploadResponse> {
    const response = await this.client.post<ApiResponse<PrepareUploadResponse>>(
      '/direct-upload/prepare',
      data
    );

    return response.data.data;
  }

  /**
   * Get list of uploaded files
   */
  async listFiles(options?: ListFilesOptions): Promise<ListFilesResponse> {
    const response = await this.client.get<ApiResponse<{
      uploads: UploadedFile[];
      pagination: { total: number; page: number; totalPages: number };
    }>>('/uploads', {
      params: {
        page: options?.page || 1,
        limit: options?.limit || 20,
        search: options?.search,
      },
    });

    return {
      files: response.data.data.uploads,
      total: response.data.data.pagination.total,
      page: response.data.data.pagination.page,
      totalPages: response.data.data.pagination.totalPages,
    };
  }

  /**
   * Get file details by ID
   */
  async getFile(fileId: string): Promise<UploadedFile> {
    const response = await this.client.get<ApiResponse<{ upload: UploadedFile }>>(
      `/uploads/${fileId}`
    );

    return response.data.data.upload;
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.client.delete(`/uploads/${fileId}`);
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string, outputPath: string): Promise<void> {
    const file = await this.getFile(fileId);

    const response = await axios.get(file.url, {
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
