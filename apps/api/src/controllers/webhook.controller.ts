import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service';
import { AppError } from '../middleware/errorHandler';

export class WebhookController {
  /**
   * Create webhook
   * POST /api/v1/webhooks
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const webhook = await webhookService.createWebhook({
        ...req.body,
        userId: req.user.userId,
      });

      res.status(201).json({
        success: true,
        data: { webhook },
        message: 'Webhook created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all webhooks
   * GET /api/v1/webhooks
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const webhooks = await webhookService.getWebhooks(req.user.userId);

      res.json({
        success: true,
        data: { webhooks },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhook by ID
   * GET /api/v1/webhooks/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const webhook = await webhookService.getWebhookById(
        req.params.id,
        req.user.userId
      );

      res.json({
        success: true,
        data: { webhook },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update webhook
   * PATCH /api/v1/webhooks/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const webhook = await webhookService.updateWebhook(
        req.params.id,
        req.user.userId,
        req.body
      );

      res.json({
        success: true,
        data: { webhook },
        message: 'Webhook updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete webhook
   * DELETE /api/v1/webhooks/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      await webhookService.deleteWebhook(req.params.id, req.user.userId);

      res.json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhook deliveries
   * GET /api/v1/webhooks/:id/deliveries
   */
  async getDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const deliveries = await webhookService.getDeliveries(
        req.params.id,
        req.user.userId,
        limit
      );

      res.json({
        success: true,
        data: { deliveries },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry delivery
   * POST /api/v1/webhooks/deliveries/:id/retry
   */
  async retryDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      await webhookService.retryDelivery(req.params.id, req.user.userId);

      res.json({
        success: true,
        message: 'Delivery retry initiated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test webhook
   * POST /api/v1/webhooks/:id/test
   */
  async test(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      await webhookService.testWebhook(req.params.id, req.user.userId);

      res.json({
        success: true,
        message: 'Test webhook sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhook statistics
   * GET /api/v1/webhooks/:id/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const stats = await webhookService.getWebhookStats(
        req.params.id,
        req.user.userId
      );

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
