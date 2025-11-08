import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import { upload, handleMulterError } from '../middleware/upload';

const router = Router();

// Upload file (supports both JWT and API key auth)
router.post(
  '/',
  (req: any, res: any, next: any) => {
    // Try JWT auth first, then API key
    if (req.headers.authorization) {
      authenticate(req, res, next);
      return;
    } else if (req.headers['x-api-key']) {
      authenticateApiKey(req, res, next);
      return;
    }
    next();
  },
  upload.single('file'),
  handleMulterError,
  uploadController.upload.bind(uploadController)
);

// List uploads (requires auth)
router.get(
  '/',
  (req: any, res: any, next: any) => {
    if (req.headers.authorization) {
      authenticate(req, res, next);
      return;
    } else if (req.headers['x-api-key']) {
      authenticateApiKey(req, res, next);
      return;
    }
    next();
  },
  uploadController.list.bind(uploadController)
);

// Get upload by ID (optional auth for public files)
router.get(
  '/:id',
  optionalAuthenticate,
  uploadController.getById.bind(uploadController)
);

// Download file (optional auth for public files)
router.get(
  '/:id/download',
  optionalAuthenticate,
  uploadController.download.bind(uploadController)
);

// Delete upload (requires auth)
router.delete(
  '/:id',
  (req: any, res: any, next: any) => {
    if (req.headers.authorization) {
      authenticate(req, res, next);
      return;
    } else if (req.headers['x-api-key']) {
      authenticateApiKey(req, res, next);
      return;
    }
    next();
  },
  uploadController.delete.bind(uploadController)
);

export default router;
