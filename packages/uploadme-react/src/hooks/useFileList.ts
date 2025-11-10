import { useState, useEffect, useCallback, useRef } from 'react';
import { UploadMeClient } from '../lib/client';
import type { UploadMeConfig, UploadedFile } from '../lib/types';

export interface UseFileListOptions extends UploadMeConfig {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

export interface UseFileListReturn {
  files: UploadedFile[];
  loading: boolean;
  error: Error | null;
  total: number;
  page: number;
  totalPages: number;
  refetch: () => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
}

export function useFileList(options: UseFileListOptions): UseFileListReturn {
  const {
    apiKey,
    apiUrl,
    page: initialPage = 1,
    limit = 20,
    search: initialSearch = '',
    autoFetch = true,
  } = options;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState(initialSearch);

  const clientRef = useRef<UploadMeClient | null>(null);

  // Initialize client
  if (!clientRef.current) {
    clientRef.current = new UploadMeClient({ apiKey, apiUrl });
  }

  const fetchFiles = useCallback(async () => {
    if (!clientRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await clientRef.current.getFiles({
        page,
        limit,
        search: search || undefined,
      });

      setFiles(result.files);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch files');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!clientRef.current) return;

      try {
        await clientRef.current.deleteFile(fileId);
        // Remove from local state
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setTotal((prev) => prev - 1);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete file');
        setError(error);
        throw error;
      }
    },
    []
  );

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchFiles();
    }
  }, [autoFetch, fetchFiles]);

  return {
    files,
    loading,
    error,
    total,
    page,
    totalPages,
    refetch: fetchFiles,
    deleteFile,
    setPage,
    setSearch,
  };
}
