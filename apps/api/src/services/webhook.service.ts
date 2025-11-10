import { Webhook, WebhookDelivery, WebhookDeliveryStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';

export interface CreateWebhookInput {
  url: string;
  events: string[];
  userId: string;
  secret?: string;
  isActive?: boolean;
}

export interface WebhookEvent {
  event: string;
  data: any;
  userId: string;
}

export class WebhookService {
  /**
   * Create a new webhook endpoint
   */
  async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    // Generate secret if not provided
    const secret = input.secret || this.generateSecret();

    const webhook = await prisma.webhook.create({
      data: {
        url: input.url,
        events: input.events,
        secret,
        userId: input.userId,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    });

    logger.info(`Webhook created: ${webhook.id} for user ${input.userId}`);
    return webhook;
  }

  /**
   * Get all webhooks for a user
   */
  async getWebhooks(userId: string): Promise<Webhook[]> {
    return prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(webhookId: string, userId: string): Promise<Webhook> {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    return webhook;
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    userId: string,
    data: Partial<CreateWebhookInput>
  ): Promise<Webhook> {
    const webhook = await this.getWebhookById(webhookId, userId);

    return prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        url: data.url,
        events: data.events,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    const webhook = await this.getWebhookById(webhookId, userId);

    await prisma.webhook.delete({
      where: { id: webhook.id },
    });

    logger.info(`Webhook deleted: ${webhookId}`);
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(event: WebhookEvent): Promise<void> {
    // Find all active webhooks for this user that listen to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId: event.userId,
        isActive: true,
        events: {
          has: event.event,
        },
      },
    });

    if (webhooks.length === 0) {
      logger.debug(`No webhooks found for event: ${event.event}`);
      return;
    }

    // Trigger all webhooks
    const deliveryPromises = webhooks.map((webhook) =>
      this.deliverWebhook(webhook, event)
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(webhook: Webhook, event: WebhookEvent): Promise<void> {
    const payload = {
      id: crypto.randomUUID(),
      event: event.event,
      data: event.data,
      timestamp: new Date().toISOString(),
    };

    // Generate signature
    const signature = this.generateSignature(payload, webhook.secret);

    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: event.event,
        payload: JSON.stringify(payload),
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
      },
    });

    // Attempt delivery
    await this.attemptDelivery(delivery, webhook, payload, signature);
  }

  /**
   * Attempt to deliver webhook
   */
  private async attemptDelivery(
    delivery: WebhookDelivery,
    webhook: Webhook,
    payload: any,
    signature: string,
    attempt: number = 1
  ): Promise<void> {
    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-ID': delivery.id,
          'User-Agent': 'UploadMe-Webhooks/1.0',
        },
        timeout: 10000, // 10 second timeout
      });

      // Success
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.DELIVERED,
          attempts: attempt,
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000),
          deliveredAt: new Date(),
        },
      });

      logger.info(`Webhook delivered: ${delivery.id} to ${webhook.url}`);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const responseStatus = error.response?.status;

      // Update delivery record
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: attempt,
          responseStatus,
          errorMessage,
          status: attempt >= 3 ? WebhookDeliveryStatus.FAILED : WebhookDeliveryStatus.PENDING,
        },
      });

      // Retry logic (max 3 attempts with exponential backoff)
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        logger.warn(`Webhook delivery failed, retrying in ${delay}ms: ${delivery.id}`);

        setTimeout(() => {
          this.attemptDelivery(delivery, webhook, payload, signature, attempt + 1);
        }, delay);
      } else {
        logger.error(`Webhook delivery failed after 3 attempts: ${delivery.id}`);
      }
    }
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(webhookId: string, userId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    // Verify webhook belongs to user
    await this.getWebhookById(webhookId, userId);

    return prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string, userId: string): Promise<void> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new AppError('Delivery not found', 404);
    }

    if (delivery.webhook.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    const payload = JSON.parse(JSON.stringify(delivery.payload));
    const signature = this.generateSignature(payload, delivery.webhook.secret);

    await this.attemptDelivery(delivery, delivery.webhook, payload, signature, delivery.attempts + 1);
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string, userId: string): Promise<void> {
    const webhook = await this.getWebhookById(webhookId, userId);

    const testEvent: WebhookEvent = {
      event: 'webhook.test',
      data: {
        message: 'This is a test webhook',
        timestamp: new Date().toISOString(),
      },
      userId,
    };

    await this.deliverWebhook(webhook, testEvent);
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate random secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string, userId: string): Promise<any> {
    await this.getWebhookById(webhookId, userId);

    const [total, delivered, failed, pending] = await Promise.all([
      prisma.webhookDelivery.count({ where: { webhookId } }),
      prisma.webhookDelivery.count({
        where: { webhookId, status: WebhookDeliveryStatus.DELIVERED },
      }),
      prisma.webhookDelivery.count({
        where: { webhookId, status: WebhookDeliveryStatus.FAILED },
      }),
      prisma.webhookDelivery.count({
        where: { webhookId, status: WebhookDeliveryStatus.PENDING },
      }),
    ]);

    return {
      total,
      delivered,
      failed,
      pending,
      successRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
    };
  }
}

export const webhookService = new WebhookService();
