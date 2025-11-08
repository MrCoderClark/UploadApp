import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKey.service';
import { AppError } from './errorHandler';
import { ApiKey } from '@prisma/client';

// Extend Express Request type to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

/**
 * Middleware to authenticate requests using API keys
 */
export const authenticateApiKey = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Get API key from header
    const apiKeyHeader = req.headers['x-api-key'] as string;

    if (!apiKeyHeader) {
      throw new AppError('API key is required', 401);
    }

    // Verify API key
    const apiKey = await apiKeyService.verifyApiKey(apiKeyHeader);

    if (!apiKey) {
      throw new AppError('Invalid API key', 401);
    }

    // Check if key is active
    if (!apiKey.isActive) {
      throw new AppError('API key is inactive', 401);
    }

    // Check if key is revoked
    if (apiKey.revokedAt) {
      throw new AppError('API key has been revoked', 401);
    }

    // Check rate limit
    const withinRateLimit = await apiKeyService.checkRateLimit(apiKey);

    if (!withinRateLimit) {
      throw new AppError('Rate limit exceeded', 429);
    }

    // Attach API key to request
    req.apiKey = apiKey;

    // Also attach user info if API key belongs to a user
    if (apiKey.userId) {
      req.user = {
        userId: apiKey.userId,
        email: '', // We don't have email in API key
        type: 'access',
      };
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid API key', 401));
    }
  }
};

/**
 * Middleware to check if API key has required scopes
 */
export const requireScopes = (requiredScopes: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next(new AppError('API key authentication required', 401));
    }

    const hasAllScopes = requiredScopes.every((scope) =>
      req.apiKey!.scopes.includes(scope)
    );

    if (!hasAllScopes) {
      return next(
        new AppError(
          `Missing required scopes: ${requiredScopes.join(', ')}`,
          403
        )
      );
    }

    next();
  };
};
