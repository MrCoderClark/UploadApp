import { Organization, OrganizationMember, OrganizationRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  userId: string; // Creator becomes owner
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  avatar?: string;
  website?: string;
}

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
}

export interface UpdateMemberRoleInput {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  updatedBy: string;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existingOrg) {
      throw new AppError('Organization slug is already taken', 409);
    }

    // Create organization and add creator as owner
    const organization = await prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        members: {
          create: {
            userId: input.userId,
            role: OrganizationRole.OWNER,
            acceptedAt: new Date(),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: 'organization.created',
        resource: 'organization',
        resourceId: organization.id,
        metadata: {
          organizationName: organization.name,
          slug: organization.slug,
        },
      },
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string, userId: string): Promise<Organization | null> {
    // Check if user is a member
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new AppError('You are not a member of this organization', 403);
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return organization;
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => m.organization);
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    userId: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    // Check if user has permission (must be OWNER or ADMIN)
    await this.checkPermission(organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: input,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'organization.updated',
        resource: 'organization',
        resourceId: organizationId,
        metadata: input as any,
      },
    });

    return organization;
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(organizationId: string, userId: string): Promise<void> {
    // Only OWNER can delete
    await this.checkPermission(organizationId, userId, [OrganizationRole.OWNER]);

    await prisma.organization.update({
      where: { id: organizationId },
      data: { deletedAt: new Date() },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'organization.deleted',
        resource: 'organization',
        resourceId: organizationId,
      },
    });
  }

  /**
   * Invite member to organization
   */
  async inviteMember(input: InviteMemberInput): Promise<OrganizationMember> {
    // Check if inviter has permission (OWNER or ADMIN)
    await this.checkPermission(input.organizationId, input.invitedBy, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new AppError('User is already a member of this organization', 409);
    }

    // Create invitation
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: input.organizationId,
        userId: user.id,
        role: input.role,
        invitedBy: input.invitedBy,
        invitedAt: new Date(),
        // Auto-accept for now (can add invitation flow later)
        acceptedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: input.invitedBy,
        action: 'organization.member_invited',
        resource: 'organization_member',
        resourceId: member.id,
        metadata: {
          organizationId: input.organizationId,
          invitedUserId: user.id,
          role: input.role,
        },
      },
    });

    return member;
  }

  /**
   * Update member role
   */
  async updateMemberRole(input: UpdateMemberRoleInput): Promise<OrganizationMember> {
    // Check if updater has permission (OWNER or ADMIN)
    await this.checkPermission(input.organizationId, input.updatedBy, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    // Cannot change the role of the last owner
    if (input.role !== OrganizationRole.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: input.organizationId,
          role: OrganizationRole.OWNER,
        },
      });

      const targetMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
      });

      if (targetMember?.role === OrganizationRole.OWNER && ownerCount === 1) {
        throw new AppError('Cannot change the role of the last owner', 400);
      }
    }

    const member = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      data: { role: input.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: input.updatedBy,
        action: 'organization.member_role_updated',
        resource: 'organization_member',
        resourceId: member.id,
        metadata: {
          organizationId: input.organizationId,
          targetUserId: input.userId,
          newRole: input.role,
        },
      },
    });

    return member;
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    organizationId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    // Check if remover has permission (OWNER or ADMIN)
    await this.checkPermission(organizationId, removedBy, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);

    // Cannot remove the last owner
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (member?.role === OrganizationRole.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId,
          role: OrganizationRole.OWNER,
        },
      });

      if (ownerCount === 1) {
        throw new AppError('Cannot remove the last owner', 400);
      }
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: removedBy,
        action: 'organization.member_removed',
        resource: 'organization_member',
        resourceId: member?.id,
        metadata: {
          organizationId,
          removedUserId: userId,
        },
      },
    });
  }

  /**
   * Check if user has required permission
   */
  private async checkPermission(
    organizationId: string,
    userId: string,
    allowedRoles: OrganizationRole[]
  ): Promise<void> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new AppError('You are not a member of this organization', 403);
    }

    if (!allowedRoles.includes(member.role)) {
      throw new AppError('You do not have permission to perform this action', 403);
    }
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember[]> {
    // Check if user is a member
    await this.checkPermission(organizationId, userId, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.MEMBER,
      OrganizationRole.GUEST,
    ]);

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return members;
  }
}

export const organizationService = new OrganizationService();
