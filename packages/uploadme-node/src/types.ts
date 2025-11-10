/**
 * Configuration options for UploadMe client
 */
export interface UploadMeConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * Uploaded file information
 */
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

/**
 * Upload progress callback
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload options
 */
export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  metadata?: Record<string, any>;
}

/**
 * Prepare upload response
 */
export interface PrepareUploadResponse {
  uploadUrl: string;
  token: string;
  uploadId: string;
  expiresAt: string;
}

/**
 * List files options
 */
export interface ListFilesOptions {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * List files response
 */
export interface ListFilesResponse {
  files: UploadedFile[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
