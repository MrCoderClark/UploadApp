import multer from 'multer';
import { AppError } from './errorHandler';
import { Request, Response, NextFunction } from 'express';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (_req: any, _file: any, cb: any) => {
  // Accept all files for now (validation happens in service)
  cb(null, true);
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Error handler for multer
export const handleMulterError = (err: any, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size exceeds 100MB limit', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
};
