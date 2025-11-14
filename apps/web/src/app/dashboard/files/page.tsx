'use client';

import { useState, useEffect } from 'react';
import SecureImage from '@/components/SecureImage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Grid3x3, 
  List, 
  Search, 
  Download, 
  Trash2, 
  Copy,
  Image as ImageIcon,
  FileText,
  Film,
  File as FileIcon,
  Scissors,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { blobToFile } from '@/lib/backgroundRemoval';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';

interface Upload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  signedUrl?: string; // Cached signed URL
}

export default function FilesPage() {
  const [files, setFiles] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const { processImage, completeJob, getJob, activeJobs } = useBackgroundRemoval();

  useEffect(() => {
    fetchFiles();
  }, []);

  // Update toast with progress for active jobs
  useEffect(() => {
    activeJobs.forEach((job) => {
      if (job.status === 'processing') {
        toast.loading(`${job.stage || 'Processing...'} ${job.progress}%`, { id: `bg-${job.fileId}` });
      }
    });
  }, [activeJobs]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/uploads');
      setFiles(response.data.data.uploads);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: Upload) => {
    try {
      const response = await api.get(`/uploads/${file.id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('File downloaded');
    } catch {
      toast.error('Failed to download file');
    }
  };

  const openDeleteDialog = (fileId: string, filename: string) => {
    setFileToDelete({ id: fileId, name: filename });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      await api.delete(`/uploads/${fileToDelete.id}`);
      setFiles(files.filter(f => f.id !== fileToDelete.id));
      toast.success(`"${fileToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const handleCopyUrl = async (fileId: string) => {
    try {
      const signedUrl = await getImageUrl(fileId);
      navigator.clipboard.writeText(signedUrl);
      toast.success('URL copied to clipboard (expires in 1 hour)');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleRemoveBackground = async (file: Upload) => {
    if (!file.mimeType.startsWith('image/')) {
      toast.error('Background removal only works with images');
      return;
    }

    try {
      // Fetch the image file via API proxy (avoids CORS issues)
      const response = await api.get(`/files/${file.id}/download`, {
        responseType: 'blob',
      });
      const blob = response.data;
      const imageFile = new File([blob], file.filename, { type: file.mimeType });
      
      // Process in Web Worker (background thread)
      processImage(file.id, imageFile, async (resultBlob) => {
        try {
          // Generate filename
          const baseName = file.originalName.replace(/\.[^/.]+$/, '');
          const newFilename = `${baseName}-no-bg.png`;
          
          // Convert blob to file for upload
          const processedFile = blobToFile(resultBlob, newFilename);
          
          toast.loading('Uploading processed image...', { id: `bg-${file.id}` });
          
          // Step 1: Request pre-signed upload URL
          const prepareResponse = await api.post('/direct-upload/prepare', {
            filename: processedFile.name,
            mimeType: processedFile.type,
            fileSize: processedFile.size,
          });

          const { uploadUrl, token } = prepareResponse.data.data;

          // Step 2: Upload file directly
          const formData = new FormData();
          formData.append('file', processedFile);

          await api.put(uploadUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Upload-Token': token,
            },
          });
          
          // Refresh the file list to show the new upload
          await fetchFiles();
          
          toast.success('Background removed and uploaded!', { id: `bg-${file.id}` });
          completeJob(file.id);
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Failed to upload processed image', { id: `bg-${file.id}` });
          completeJob(file.id);
        }
      });
    } catch (error) {
      console.error('Background removal error:', error);
      toast.error('Failed to remove background. Try a smaller image.', { id: `bg-${file.id}` });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Film;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return FileIcon;
  };

  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getImageUrl = async (fileId: string): Promise<string> => {
    try {
      // Check if we already have a cached signed URL
      const file = files.find(f => f.id === fileId);
      if (file?.signedUrl) {
        return file.signedUrl;
      }

      // Fetch signed URL from API
      const response = await api.get(`/files/${fileId}/url`);
      const signedUrl = response.data.data.url;

      // Cache the signed URL
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId ? { ...f, signedUrl } : f
        )
      );

      return signedUrl;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      // Fallback to direct URL if signed URL fails
      const file = files.find(f => f.id === fileId);
      return file?.url || '';
    }
  };

  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fileToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Files</h2>
          <p className="text-gray-500">{files.length} files uploaded</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Files Grid/List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">Loading files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-center">
              <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No files found</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            return (
              <Card key={file.id} className="overflow-hidden flex flex-col">
                <div className="h-40 bg-gray-100 flex items-center justify-center relative">
                  {file.mimeType.startsWith('image/') ? (
                    <SecureImage
                      fileId={file.id}
                      alt={file.originalName}
                      fill
                      className="object-cover"
                      getSignedUrl={getImageUrl}
                    />
                  ) : (
                    <Icon className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <CardContent className="p-3 flex-1 flex flex-col">
                  <div className="flex-1 min-h-0">
                    <p className="truncate font-medium text-sm" title={file.originalName}>
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyUrl(file.id)}
                      title="Copy URL"
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {file.mimeType.startsWith('image/') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBackground(file)}
                        title="Remove Background"
                        className="h-8 w-8 p-0"
                        disabled={!!getJob(file.id)}
                      >
                        <Scissors className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      title="Download"
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(file.id, file.originalName)}
                      title="Delete"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="shrink-0">
                        {file.mimeType.startsWith('image/') ? (
                          <div className="h-12 w-12 rounded relative overflow-hidden">
                            <SecureImage
                              fileId={file.id}
                              alt={file.originalName}
                              fill
                              className="object-cover"
                              getSignedUrl={getImageUrl}
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                            <Icon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium" title={file.originalName}>
                          {file.originalName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(file.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {file.mimeType.startsWith('image/') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBackground(file)}
                          disabled={!!getJob(file.id)}
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(file.id, file.originalName)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
