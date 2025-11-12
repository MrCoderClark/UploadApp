import { Router } from 'express';
import { userManagementController } from '../controllers/userManagement.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// User statistics
router.get('/stats', userManagementController.getStats.bind(userManagementController));

// List and get users
router.get('/', userManagementController.listUsers.bind(userManagementController));
router.get('/:id', userManagementController.getUserById.bind(userManagementController));

// Update user
router.put('/:id', userManagementController.updateUser.bind(userManagementController));

// Suspend/unsuspend user
router.post('/:id/suspend', userManagementController.suspendUser.bind(userManagementController));
router.post('/:id/unsuspend', userManagementController.unsuspendUser.bind(userManagementController));

// Restore deleted user
router.post('/:id/restore', userManagementController.restoreUser.bind(userManagementController));

// Reset password
router.post('/:id/reset-password', userManagementController.resetPassword.bind(userManagementController));

// Delete user
router.delete('/:id', userManagementController.deleteUser.bind(userManagementController));

export default router;
