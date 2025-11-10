import axios, { AxiosInstance, AxiosProgressEvent } from 'axios';
import type { UploadMeConfig, PrepareUploadResponse, UploadedFile, UploadProgress } from './types';

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
   * Prepare upload - get pre-signed URL and token
   */
  async prepareUpload(file: File): Promise<PrepareUploadResponse> {
    const response = await this.client.post<{ success: boolean; data: PrepareUploadResponse }>(
      '/direct-upload/prepare',
      {
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }
    );

    return response.data.data;
  }

  /**
   * Upload file using pre-signed URL
   */
  async uploadFile(
    file: File,
    prepareData: PrepareUploadResponse,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.put<{ success: boolean; data: { upload: UploadedFile } }>(
      prepareData.uploadUrl,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Upload-Token': prepareData.token,
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress({
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
   * Complete upload flow (prepare + upload)
   */
  async upload(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    const prepareData = await this.prepareUpload(file);
    return await this.uploadFile(file, prepareData, onProgress);
  }

  /**
   * Get list of uploaded files
   */
  async getFiles(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ files: UploadedFile[]; total: number; page: number; totalPages: number }> {
    const response = await this.client.get<{
      success: boolean;
      data: { uploads: UploadedFile[]; pagination: { total: number; page: number; totalPages: number } };
    }>('/uploads', { params });

    return {
      files: response.data.data.uploads,
      total: response.data.data.pagination.total,
      page: response.data.data.pagination.page,
      totalPages: response.data.data.pagination.totalPages,
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.client.delete(`/uploads/${fileId}`);
  }

  /**
   * Get file details
   */
  async getFile(fileId: string): Promise<UploadedFile> {
    const response = await this.client.get<{ success: boolean; data: { upload: UploadedFile } }>(
      `/uploads/${fileId}`
    );

    return response.data.data.upload;
  }
}
