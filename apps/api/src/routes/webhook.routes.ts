import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createWebhookSchema = z.object({
  body: z.object({
    url: z.string().url('Invalid URL'),
    events: z.array(z.string()).min(1, 'At least one event is required'),
    isActive: z.boolean().optional(),
  }),
});

const updateWebhookSchema = z.object({
  body: z.object({
    url: z.string().url('Invalid URL').optional(),
    events: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

// Webhook CRUD
router.post(
  '/',
  validate(createWebhookSchema),
  webhookController.create.bind(webhookController)
);

router.get('/', webhookController.getAll.bind(webhookController));

router.get('/:id', webhookController.getById.bind(webhookController));

router.patch(
  '/:id',
  validate(updateWebhookSchema),
  webhookController.update.bind(webhookController)
);

router.delete('/:id', webhookController.delete.bind(webhookController));

// Webhook actions
router.get('/:id/deliveries', webhookController.getDeliveries.bind(webhookController));

router.post('/:id/test', webhookController.test.bind(webhookController));

router.get('/:id/stats', webhookController.getStats.bind(webhookController));

router.post('/deliveries/:id/retry', webhookController.retryDelivery.bind(webhookController));

export default router;
