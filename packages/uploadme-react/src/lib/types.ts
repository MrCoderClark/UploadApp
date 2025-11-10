export interface UploadMeConfig {
  apiKey: string;
  apiUrl?: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
}

export interface PrepareUploadResponse {
  uploadUrl: string;
  token: string;
  uploadId: string;
  expiresAt: string;
}

export interface UploadButtonProps extends UploadMeConfig {
  onSuccess?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export interface UploadDropzoneProps extends UploadMeConfig {
  onSuccess?: (files: UploadedFile[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface FilePreviewProps {
  files: UploadedFile[];
  onDelete?: (fileId: string) => void;
  className?: string;
}
