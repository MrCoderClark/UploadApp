import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '../validators/organization.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Organization CRUD
router.post(
  '/',
  validate(createOrganizationSchema),
  organizationController.create.bind(organizationController)
);

router.get('/', organizationController.getUserOrganizations.bind(organizationController));

router.get('/:id', organizationController.getById.bind(organizationController));

router.patch(
  '/:id',
  validate(updateOrganizationSchema),
  organizationController.update.bind(organizationController)
);

router.delete('/:id', organizationController.delete.bind(organizationController));

// Member management
router.get('/:id/members', organizationController.getMembers.bind(organizationController));

router.post(
  '/:id/members',
  validate(inviteMemberSchema),
  organizationController.inviteMember.bind(organizationController)
);

router.patch(
  '/:id/members/:userId',
  validate(updateMemberRoleSchema),
  organizationController.updateMemberRole.bind(organizationController)
);

router.delete(
  '/:id/members/:userId',
  organizationController.removeMember.bind(organizationController)
);

export default router;
