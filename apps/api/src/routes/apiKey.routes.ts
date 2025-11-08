import { Router } from 'express';
import { apiKeyController } from '../controllers/apiKey.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { createApiKeySchema, updateApiKeySchema } from '../validators/apiKey.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// API key CRUD
router.post(
  '/',
  validate(createApiKeySchema),
  apiKeyController.create.bind(apiKeyController)
);

router.get('/', apiKeyController.getUserApiKeys.bind(apiKeyController));

router.get('/:id', apiKeyController.getById.bind(apiKeyController));

router.patch(
  '/:id',
  validate(updateApiKeySchema),
  apiKeyController.update.bind(apiKeyController)
);

router.delete('/:id', apiKeyController.delete.bind(apiKeyController));

// API key actions
router.post('/:id/revoke', apiKeyController.revoke.bind(apiKeyController));

router.post('/:id/rotate', apiKeyController.rotate.bind(apiKeyController));

export default router;
