import prisma from '../lib/prisma';
import { getPlanLimits } from '../config/plans';

export class SubscriptionService {
  /**
   * Create a free subscription for a new user
   */
  async createFreeSubscription(userId: string) {
    const limits = getPlanLimits('FREE');

    return await prisma.subscription.create({
      data: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        storageLimit: BigInt(limits.storageLimit),
        uploadLimit: limits.uploadLimit,
        bandwidthLimit: BigInt(limits.bandwidthLimit),
        usageResetAt: this.getNextResetDate(),
      },
    });
  }

  /**
   * Get subscription by user ID
   */
  async getByUserId(userId: string) {
    return await prisma.subscription.findUnique({
      where: { userId },
    });
  }

  /**
   * Get subscription by organization ID
   */
  async getByOrganizationId(organizationId: string) {
    return await prisma.subscription.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Check if user can upload (within limits)
   */
  async canUpload(userId: string, fileSize: number): Promise<{
    allowed: boolean;
    reason?: string;
    limit?: number;
    current?: number;
  }> {
    const subscription = await this.getByUserId(userId);
    
    if (!subscription) {
      return { allowed: false, reason: 'No subscription found' };
    }

    // Check if usage needs to be reset
    await this.resetUsageIfNeeded(subscription.id);

    // Refresh subscription data
    const updatedSubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });

    if (!updatedSubscription) {
      return { allowed: false, reason: 'Subscription not found' };
    }

    // Check subscription status
    if (updatedSubscription.status !== 'ACTIVE' && updatedSubscription.status !== 'TRIALING') {
      return { allowed: false, reason: 'Subscription is not active' };
    }

    // Check upload limit
    if (updatedSubscription.uploadsUsed >= updatedSubscription.uploadLimit) {
      return {
        allowed: false,
        reason: 'Monthly upload limit reached',
        limit: updatedSubscription.uploadLimit,
        current: updatedSubscription.uploadsUsed,
      };
    }

    // Check storage limit
    const newStorageUsed = Number(updatedSubscription.storageUsed) + fileSize;
    if (newStorageUsed > Number(updatedSubscription.storageLimit)) {
      return {
        allowed: false,
        reason: 'Storage limit exceeded',
        limit: Number(updatedSubscription.storageLimit),
        current: Number(updatedSubscription.storageUsed),
      };
    }

    return { allowed: true };
  }

  /**
   * Track upload usage
   */
  async trackUpload(userId: string, fileSize: number, uploadId: string) {
    const subscription = await this.getByUserId(userId);
    
    if (!subscription) {
      throw new Error('No subscription found');
    }

    // Update subscription usage
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        uploadsUsed: { increment: 1 },
        storageUsed: { increment: BigInt(fileSize) },
      },
    });

    // Create usage record
    await prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        type: 'UPLOAD',
        amount: BigInt(1),
        resourceId: uploadId,
      },
    });

    await prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        type: 'STORAGE',
        amount: BigInt(fileSize),
        resourceId: uploadId,
      },
    });
  }

  /**
   * Track bandwidth usage
   */
  async trackBandwidth(userId: string, bytes: number) {
    const subscription = await this.getByUserId(userId);
    
    if (!subscription) {
      return;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        bandwidthUsed: { increment: BigInt(bytes) },
      },
    });

    await prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        type: 'BANDWIDTH',
        amount: BigInt(bytes),
      },
    });
  }

  /**
   * Track file deletion (reduce storage usage)
   */
  async trackDeletion(userId: string, fileSize: number) {
    const subscription = await this.getByUserId(userId);
    
    if (!subscription) {
      return;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        storageUsed: { decrement: BigInt(fileSize) },
      },
    });
  }

  /**
   * Reset usage if period has ended
   */
  async resetUsageIfNeeded(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return;
    }

    const now = new Date();
    if (now > subscription.usageResetAt) {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          uploadsUsed: 0,
          bandwidthUsed: BigInt(0),
          usageResetAt: this.getNextResetDate(),
        },
      });
    }
  }

  /**
   * Get next reset date (first day of next month)
   */
  private getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  /**
   * Upgrade subscription plan
   */
  async upgradePlan(userId: string, newPlan: 'PRO' | 'ENTERPRISE') {
    const subscription = await this.getByUserId(userId);
    
    if (!subscription) {
      throw new Error('No subscription found');
    }

    const limits = getPlanLimits(newPlan);

    return await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: newPlan,
        storageLimit: BigInt(limits.storageLimit),
        uploadLimit: limits.uploadLimit,
        bandwidthLimit: BigInt(limits.bandwidthLimit),
      },
    });
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(userId: string) {
    const subscription = await this.getByUserId(userId);
    
    if (!subscription) {
      return null;
    }

    await this.resetUsageIfNeeded(subscription.id);

    const updatedSubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });

    if (!updatedSubscription) {
      return null;
    }

    return {
      plan: updatedSubscription.plan,
      status: updatedSubscription.status,
      storage: {
        used: Number(updatedSubscription.storageUsed),
        limit: Number(updatedSubscription.storageLimit),
        percentage: Math.round((Number(updatedSubscription.storageUsed) / Number(updatedSubscription.storageLimit)) * 100),
      },
      uploads: {
        used: updatedSubscription.uploadsUsed,
        limit: updatedSubscription.uploadLimit,
        percentage: Math.round((updatedSubscription.uploadsUsed / updatedSubscription.uploadLimit) * 100),
      },
      bandwidth: {
        used: Number(updatedSubscription.bandwidthUsed),
        limit: Number(updatedSubscription.bandwidthLimit),
        percentage: Math.round((Number(updatedSubscription.bandwidthUsed) / Number(updatedSubscription.bandwidthLimit)) * 100),
      },
      resetAt: updatedSubscription.usageResetAt,
    };
  }
}

export const subscriptionService = new SubscriptionService();
