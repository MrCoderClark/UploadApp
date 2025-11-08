'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function DashboardPage() {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);

    try {
      // Upload files sequentially with progress tracking
      for (let i = 0; i < files.length; i++) {
        const fileWithProgress = files[i];
        
        // Update status to uploading
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading' as const } : f
        ));

        try {
          const formData = new FormData();
          formData.append('file', fileWithProgress.file);
          formData.append('isPublic', 'false');

          await api.post('/uploads', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const progress = progressEvent.total
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0;
              
              setFiles(prev => prev.map((f, idx) => 
                idx === i ? { ...f, progress } : f
              ));
            },
          });

          // Mark as success
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'success' as const, progress: 100 } : f
          ));
        } catch (error) {
          const err = error as { response?: { data?: { error?: { message?: string } } } };
          const errorMessage = err.response?.data?.error?.message || 'Upload failed';
          
          // Mark as error
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error' as const, error: errorMessage } : f
          ));
        }
      }

      const successCount = files.filter(f => f.status === 'success').length;
      const errorCount = files.filter(f => f.status === 'error').length;

      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} file(s) failed to upload`);
      }

      // Remove successful uploads after 2 seconds
      setTimeout(() => {
        setFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 2000);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Upload Files</h2>
        <p className="text-gray-500">Drag and drop files or click to browse</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>
            Upload files up to 100MB. Supported formats: images, documents, videos, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {isDragActive
                ? 'Drop the files here...'
                : 'Drag & drop files here, or click to select files'}
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Selected Files ({files.length})</h3>
              <div className="space-y-3">
                {files.map((fileWithProgress, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {fileWithProgress.status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : fileWithProgress.status === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <File className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {fileWithProgress.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(fileWithProgress.file.size)}
                            {fileWithProgress.status === 'error' && fileWithProgress.error && (
                              <span className="text-red-500 ml-2">• {fileWithProgress.error}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {fileWithProgress.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    {(fileWithProgress.status === 'uploading' || fileWithProgress.status === 'success') && (
                      <Progress value={fileWithProgress.progress} className="h-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload button */}
          {files.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
