import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKey.service';
import { AppError } from '../middleware/errorHandler';

export class ApiKeyController {
  /**
   * Create API key
   * POST /api/v1/api-keys
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { apiKey, plainKey } = await apiKeyService.createApiKey({
        ...req.body,
        userId: req.user.userId,
      });

      res.status(201).json({
        success: true,
        data: {
          apiKey,
          plainKey,
        },
        message: 'API key created successfully. Save the plain key securely - it will not be shown again.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's API keys
   * GET /api/v1/api-keys
   */
  async getUserApiKeys(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { organizationId } = req.query;

      const apiKeys = await apiKeyService.getApiKeys(
        req.user.userId,
        organizationId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: { apiKeys },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key by ID
   * GET /api/v1/api-keys/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { organizationId } = req.query;

      const apiKey = await apiKeyService.getApiKeyById(
        req.params.id,
        req.user.userId,
        organizationId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: { apiKey },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update API key
   * PATCH /api/v1/api-keys/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { organizationId } = req.query;

      const apiKey = await apiKeyService.updateApiKey(
        req.params.id,
        req.body,
        req.user.userId,
        organizationId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: { apiKey },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke API key
   * POST /api/v1/api-keys/:id/revoke
   */
  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { organizationId } = req.query;

      await apiKeyService.revokeApiKey(
        req.params.id,
        req.user.userId,
        organizationId as string | undefined
      );

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete API key
   * DELETE /api/v1/api-keys/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { organizationId } = req.query;

      await apiKeyService.deleteApiKey(
        req.params.id,
        req.user.userId,
        organizationId as string | undefined
      );

      res.status(200).json({
        success: true,
        message: 'API key deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rotate API key
   * POST /api/v1/api-keys/:id/rotate
   */
  async rotate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { organizationId } = req.query;

      const { apiKey, plainKey } = await apiKeyService.rotateApiKey(
        req.params.id,
        req.user.userId,
        organizationId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: {
          apiKey,
          plainKey,
        },
        message: 'API key rotated successfully. Save the new key securely - it will not be shown again.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const apiKeyController = new ApiKeyController();
