import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { subscriptionService } from '../services/subscription.service';
import { stripeService } from '../services/stripe.service';
import { PLAN_LIMITS } from '../config/plans';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * Get current user's subscription
 * GET /api/v1/subscription
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const subscription = await subscriptionService.getByUserId(userId);

    if (!subscription) {
      throw new AppError('No subscription found', 404);
    }

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          storageLimit: Number(subscription.storageLimit),
          uploadLimit: subscription.uploadLimit,
          bandwidthLimit: Number(subscription.bandwidthLimit),
          storageUsed: Number(subscription.storageUsed),
          uploadsUsed: subscription.uploadsUsed,
          bandwidthUsed: Number(subscription.bandwidthUsed),
          usageResetAt: subscription.usageResetAt,
          createdAt: subscription.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get usage statistics
 * GET /api/v1/subscription/usage
 */
router.get('/usage', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const stats = await subscriptionService.getUsageStats(userId);

    if (!stats) {
      throw new AppError('No subscription found', 404);
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get available plans
 * GET /api/v1/subscription/plans
 */
router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = Object.values(PLAN_LIMITS).map(plan => ({
      name: plan.name,
      displayName: plan.displayName,
      price: plan.price,
      yearlyPrice: plan.yearlyPrice,
      storageLimit: plan.storageLimit,
      uploadLimit: plan.uploadLimit,
      bandwidthLimit: plan.bandwidthLimit,
      maxFileSize: plan.maxFileSize,
      features: plan.features,
    }));

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create checkout session for plan upgrade
 * POST /api/v1/subscription/checkout
 */
router.post('/checkout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { plan, billingPeriod } = req.body;

    if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
      throw new AppError('Invalid plan', 400);
    }

    if (billingPeriod && !['monthly', 'yearly'].includes(billingPeriod)) {
      throw new AppError('Invalid billing period', 400);
    }

    // Create Stripe checkout session
    const session = await stripeService.createCheckoutSession(
      userId,
      plan,
      billingPeriod || 'monthly'
    );

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upgrade subscription plan (simulated - for testing without payment)
 * POST /api/v1/subscription/upgrade
 */
router.post('/upgrade', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { plan } = req.body;

    if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
      throw new AppError('Invalid plan', 400);
    }

    // Simulated upgrade (no payment required)
    const subscription = await subscriptionService.upgradePlan(userId, plan);

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
        },
      },
      message: `Successfully upgraded to ${plan} plan (simulated)`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel subscription
 * POST /api/v1/subscription/cancel
 */
router.post('/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { cancelAtPeriodEnd } = req.body;

    await stripeService.cancelSubscription(userId, cancelAtPeriodEnd !== false);

    res.json({
      success: true,
      message: cancelAtPeriodEnd !== false 
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create customer portal session
 * POST /api/v1/subscription/portal
 */
router.post('/portal', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const portal = await stripeService.createPortalSession(userId);

    res.json({
      success: true,
      data: { url: portal.url },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
