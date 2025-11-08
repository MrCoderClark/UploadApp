import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

interface UploadData {
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // Get total files and storage
    const uploads = await prisma.upload.findMany({
      where: { userId },
      select: {
        size: true,
        mimeType: true,
        uploadedAt: true,
      },
    });

    const totalFiles = uploads.length;
    const totalStorage = uploads.reduce((sum: number, upload: UploadData) => sum + upload.size, 0);

    // Get uploads today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const uploadsToday = uploads.filter((u: UploadData) => new Date(u.uploadedAt) >= today).length;

    // Calculate bandwidth (for now, same as storage - in production track downloads)
    const totalBandwidth = totalStorage;

    // Group by file type
    const filesByType = {
      images: uploads.filter((u: UploadData) => u.mimeType.startsWith('image/')).length,
      videos: uploads.filter((u: UploadData) => u.mimeType.startsWith('video/')).length,
      documents: uploads.filter((u: UploadData) => 
        u.mimeType.includes('pdf') || 
        u.mimeType.includes('document') ||
        u.mimeType.includes('text')
      ).length,
      others: 0,
    };
    filesByType.others = totalFiles - filesByType.images - filesByType.videos - filesByType.documents;

    // Get recent uploads
    const recentUploads = await prisma.upload.findMany({
      where: { userId },
      select: {
        id: true,
        originalName: true,
        size: true,
        mimeType: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: 10,
    });

    // Storage by day (last 7 days)
    const storageByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayUploads = uploads.filter((u: UploadData) => {
        const uploadDate = new Date(u.uploadedAt);
        return uploadDate >= date && uploadDate < nextDate;
      });

      const dayStorage = dayUploads.reduce((sum: number, u: UploadData) => sum + u.size, 0);

      storageByDay.push({
        date: date.toISOString(),
        size: dayStorage,
      });
    }

    res.json({
      success: true,
      data: {
        totalFiles,
        totalStorage,
        totalBandwidth,
        uploadsToday,
        filesByType,
        recentUploads,
        storageByDay,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
