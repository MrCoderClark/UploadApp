import { Router } from 'express';
import { passwordResetController } from '../controllers/passwordReset.controller';
import { validate } from '../middleware/validate';
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../validators/passwordReset.validator';

const router = Router();

// Request password reset (sends email)
router.post(
  '/request',
  validate(requestPasswordResetSchema),
  passwordResetController.requestReset.bind(passwordResetController)
);

// Reset password with token
router.post(
  '/reset',
  validate(resetPasswordSchema),
  passwordResetController.resetPassword.bind(passwordResetController)
);

// Verify if token is valid
router.get(
  '/verify/:token',
  passwordResetController.verifyToken.bind(passwordResetController)
);

export default router;
