/**
 * Subscription Plan Configuration
 * Define limits and features for each plan tier
 */

export interface PlanLimits {
  name: string;
  displayName: string;
  price: number; // Monthly price in cents (USD)
  yearlyPrice: number; // Yearly price in cents (USD)
  storageLimit: number; // Bytes
  uploadLimit: number; // Uploads per month
  bandwidthLimit: number; // Bytes per month
  maxFileSize: number; // Bytes
  features: string[];
  stripePriceId?: string; // Stripe price ID for monthly
  stripeYearlyPriceId?: string; // Stripe price ID for yearly
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    name: 'FREE',
    displayName: 'Free',
    price: 0,
    yearlyPrice: 0,
    storageLimit: 1 * 1024 * 1024 * 1024, // 1GB
    uploadLimit: 100, // 100 uploads/month
    bandwidthLimit: 10 * 1024 * 1024 * 1024, // 10GB/month
    maxFileSize: 10 * 1024 * 1024, // 10MB
    features: [
      '1GB storage',
      '100 uploads per month',
      '10GB bandwidth',
      'Max 10MB per file',
      'Basic image transformations',
      'Community support',
    ],
  },
  PRO: {
    name: 'PRO',
    displayName: 'Pro',
    price: 1900, // $19/month
    yearlyPrice: 19000, // $190/year (save ~17%)
    storageLimit: 100 * 1024 * 1024 * 1024, // 100GB
    uploadLimit: 10000, // 10K uploads/month
    bandwidthLimit: 1000 * 1024 * 1024 * 1024, // 1TB/month
    maxFileSize: 100 * 1024 * 1024, // 100MB
    features: [
      '100GB storage',
      '10,000 uploads per month',
      '1TB bandwidth',
      'Max 100MB per file',
      'Advanced image transformations',
      'Video processing',
      'Custom domains',
      'Webhooks',
      'Priority support',
      'API access',
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    stripeYearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  ENTERPRISE: {
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    price: 9900, // $99/month
    yearlyPrice: 99000, // $990/year (save ~17%)
    storageLimit: 1000 * 1024 * 1024 * 1024, // 1TB
    uploadLimit: 100000, // 100K uploads/month
    bandwidthLimit: 10000 * 1024 * 1024 * 1024, // 10TB/month
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    features: [
      '1TB storage',
      '100,000 uploads per month',
      '10TB bandwidth',
      'Max 1GB per file',
      'All transformations',
      'Video processing',
      'Custom domains',
      'Webhooks',
      'Advanced security',
      'SLA guarantee',
      'Dedicated support',
      'Custom integrations',
      'White-label option',
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    stripeYearlyPriceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  },
};

/**
 * Get plan limits by plan name
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

/**
 * Check if usage exceeds plan limits
 */
export function isOverLimit(
  plan: string,
  usage: {
    storage?: number;
    uploads?: number;
    bandwidth?: number;
  }
): {
  exceeded: boolean;
  type?: 'storage' | 'uploads' | 'bandwidth';
  limit?: number;
  current?: number;
} {
  const limits = getPlanLimits(plan);

  if (usage.storage && usage.storage > limits.storageLimit) {
    return {
      exceeded: true,
      type: 'storage',
      limit: limits.storageLimit,
      current: usage.storage,
    };
  }

  if (usage.uploads && usage.uploads > limits.uploadLimit) {
    return {
      exceeded: true,
      type: 'uploads',
      limit: limits.uploadLimit,
      current: usage.uploads,
    };
  }

  if (usage.bandwidth && usage.bandwidth > limits.bandwidthLimit) {
    return {
      exceeded: true,
      type: 'bandwidth',
      limit: limits.bandwidthLimit,
      current: usage.bandwidth,
    };
  }

  return { exceeded: false };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
