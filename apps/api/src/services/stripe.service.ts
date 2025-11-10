import Stripe from 'stripe';
import { config } from '../config';
import prisma from '../lib/prisma';
import { PLAN_LIMITS } from '../config/plans';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-10-29.clover',
});

export class StripeService {
  /**
   * Create a checkout session for plan upgrade
   */
  async createCheckoutSession(
    userId: string,
    plan: 'PRO' | 'ENTERPRISE',
    billingPeriod: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{ sessionId: string; url: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get plan details
    const planDetails = PLAN_LIMITS[plan];
    const priceId = billingPeriod === 'yearly' 
      ? planDetails.stripeYearlyPriceId 
      : planDetails.stripePriceId;

    if (!priceId) {
      throw new Error('Stripe price ID not configured for this plan');
    }

    // Get or create Stripe customer
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      if (user.subscription) {
        await prisma.subscription.update({
          where: { id: user.subscription.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${config.frontendUrl}/dashboard/subscription?success=true`,
      cancel_url: `${config.frontendUrl}/dashboard/subscription?canceled=true`,
      metadata: {
        userId: user.id,
        plan,
        billingPeriod,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Handle successful payment webhook
   */
  async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'PRO' | 'ENTERPRISE';

    if (!userId || !plan) {
      throw new Error('Missing metadata in checkout session');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Get plan limits
    const limits = PLAN_LIMITS[plan];

    // Update subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        status: 'ACTIVE',
        stripeSubscriptionId: session.subscription as string,
        stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        storageLimit: BigInt(limits.storageLimit),
        uploadLimit: limits.uploadLimit,
        bandwidthLimit: BigInt(limits.bandwidthLimit),
      },
    });

    console.log(`✅ Upgraded user ${userId} to ${plan} plan`);
  }

  /**
   * Handle subscription updated webhook
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      console.warn(`Subscription not found for Stripe ID: ${subscription.id}`);
      return;
    }

    // Update subscription status
    const periodEnd = (subscription as any).current_period_end;
    
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status) as any,
        stripeCurrentPeriodEnd: periodEnd 
          ? new Date(periodEnd * 1000) 
          : undefined,
      },
    });
  }

  /**
   * Handle subscription deleted/canceled webhook
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) {
      return;
    }

    // Downgrade to FREE plan
    const freeLimits = PLAN_LIMITS.FREE;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        plan: 'FREE',
        status: 'CANCELED',
        storageLimit: BigInt(freeLimits.storageLimit),
        uploadLimit: freeLimits.uploadLimit,
        bandwidthLimit: BigInt(freeLimits.bandwidthLimit),
        canceledAt: new Date(),
      },
    });

    console.log(`⬇️ Downgraded subscription ${dbSubscription.id} to FREE`);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active Stripe subscription found');
    }

    if (cancelAtPeriodEnd) {
      // Cancel at end of billing period
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    } else {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      const freeLimits = PLAN_LIMITS.FREE;

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: 'FREE',
          status: 'CANCELED',
          storageLimit: BigInt(freeLimits.storageLimit),
          uploadLimit: freeLimits.uploadLimit,
          bandwidthLimit: BigInt(freeLimits.bandwidthLimit),
          canceledAt: new Date(),
        },
      });
    }
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${config.frontendUrl}/dashboard/subscription`,
    });

    return { url: session.url };
  }

  /**
   * Map Stripe subscription status to our status
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      unpaid: 'UNPAID',
    };

    return statusMap[stripeStatus] || 'ACTIVE';
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  }
}

export const stripeService = new StripeService();
