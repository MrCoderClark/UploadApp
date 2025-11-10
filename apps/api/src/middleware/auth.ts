import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { AppError } from './errorHandler';
import { apiKeyService } from '../services/apiKey.service';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid or expired token', 401));
    }
  }
};

export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Silently fail for optional authentication
    next();
  }
};

/**
 * Authenticate using API key
 * Supports both JWT tokens and API keys
 */
export const authenticateWithApiKey = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    // Try to validate as API key first (64 hex chars)
    if (token.length === 64 && /^[a-f0-9]{64}$/.test(token)) {
      // Validate API key
      const apiKey = await apiKeyService.validateApiKey(token);
      
      if (!apiKey) {
        throw new AppError('Invalid API key', 401);
      }

      // Attach user info from API key
      req.user = {
        userId: apiKey.userId!,
        email: '', // API keys don't have email
        type: 'access',
      };
    } else {
      // It's a JWT token
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid or expired token', 401));
    }
  }
};
