import { useState, useCallback, useRef } from 'react';
import { UploadMeClient } from '../lib/client';
import type { UploadMeConfig, UploadedFile, UploadProgress } from '../lib/types';

export interface UseUploadOptions extends UploadMeConfig {
  onSuccess?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UseUploadReturn {
  upload: (file: File) => Promise<UploadedFile | null>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  uploadedFile: UploadedFile | null;
  reset: () => void;
}

export function useUpload(options: UseUploadOptions): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const clientRef = useRef<UploadMeClient | null>(null);

  // Initialize client
  if (!clientRef.current) {
    clientRef.current = new UploadMeClient({
      apiKey: options.apiKey,
      apiUrl: options.apiUrl,
    });
  }

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      if (!clientRef.current) return null;

      setIsUploading(true);
      setProgress(0);
      setError(null);
      setUploadedFile(null);

      try {
        const result = await clientRef.current.upload(file, (progressData) => {
          setProgress(progressData.percentage);
          options.onProgress?.(progressData);
        });

        setUploadedFile(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setUploadedFile(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    uploadedFile,
    reset,
  };
}
