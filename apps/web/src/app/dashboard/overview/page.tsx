'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  HardDrive, 
  Activity, 
  TrendingUp,
  FileText,
  Image as ImageIcon,
  Film,
  File as FileIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface AnalyticsData {
  totalFiles: number;
  totalStorage: number;
  totalBandwidth: number;
  uploadsToday: number;
  filesByType: {
    images: number;
    videos: number;
    documents: number;
    others: number;
  };
  recentUploads: Array<{
    id: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  }>;
  storageByDay: Array<{
    date: string;
    size: number;
  }>;
}

export default function OverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/overview');
      setAnalytics(response.data.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Film;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return FileIcon;
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const totalFilesByType = 
    analytics.filesByType.images + 
    analytics.filesByType.videos + 
    analytics.filesByType.documents + 
    analytics.filesByType.others;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-gray-500">Your upload statistics and insights</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <Upload className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFiles}</div>
            <p className="text-xs text-gray-500">
              {analytics.uploadsToday} uploaded today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(analytics.totalStorage)}</div>
            <p className="text-xs text-gray-500">
              Across all files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(analytics.totalBandwidth)}</div>
            <p className="text-xs text-gray-500">
              Total transferred
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg File Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalFiles > 0 
                ? formatFileSize(analytics.totalStorage / analytics.totalFiles)
                : '0 Bytes'
              }
            </div>
            <p className="text-xs text-gray-500">
              Per file
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* File Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>File Types</CardTitle>
            <CardDescription>Distribution by file type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Images */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <span>Images</span>
                  </div>
                  <span className="font-medium">
                    {analytics.filesByType.images} ({calculatePercentage(analytics.filesByType.images, totalFilesByType)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-2 rounded-full bg-blue-500" 
                    style={{ width: `${calculatePercentage(analytics.filesByType.images, totalFilesByType)}%` }}
                  />
                </div>
              </div>

              {/* Videos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Film className="h-4 w-4 text-purple-500" />
                    <span>Videos</span>
                  </div>
                  <span className="font-medium">
                    {analytics.filesByType.videos} ({calculatePercentage(analytics.filesByType.videos, totalFilesByType)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-2 rounded-full bg-purple-500" 
                    style={{ width: `${calculatePercentage(analytics.filesByType.videos, totalFilesByType)}%` }}
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span>Documents</span>
                  </div>
                  <span className="font-medium">
                    {analytics.filesByType.documents} ({calculatePercentage(analytics.filesByType.documents, totalFilesByType)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-2 rounded-full bg-green-500" 
                    style={{ width: `${calculatePercentage(analytics.filesByType.documents, totalFilesByType)}%` }}
                  />
                </div>
              </div>

              {/* Others */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <FileIcon className="h-4 w-4 text-gray-500" />
                    <span>Others</span>
                  </div>
                  <span className="font-medium">
                    {analytics.filesByType.others} ({calculatePercentage(analytics.filesByType.others, totalFilesByType)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-2 rounded-full bg-gray-500" 
                    style={{ width: `${calculatePercentage(analytics.filesByType.others, totalFilesByType)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>Latest files uploaded</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentUploads.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-500">
                No recent uploads
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.recentUploads.slice(0, 5).map((upload) => {
                  const Icon = getFileIcon(upload.mimeType);
                  return (
                    <div key={upload.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {upload.originalName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(upload.size)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {new Date(upload.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>Storage growth over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between space-x-2">
            {analytics.storageByDay.map((day, index) => {
              const maxStorage = Math.max(...analytics.storageByDay.map(d => d.size));
              const height = maxStorage > 0 ? (day.size / maxStorage) * 100 : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                  <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                    <div 
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                      style={{ height: `${height}%` }}
                      title={`${formatFileSize(day.size)}`}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
