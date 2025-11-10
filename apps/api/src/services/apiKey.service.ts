import { ApiKey } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';
import { hashPassword, comparePassword } from '../utils/password';

export interface CreateApiKeyInput {
  name: string;
  userId?: string;
  organizationId?: string;
  scopes: string[];
  rateLimit?: number;
  expiresAt?: Date;
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: string[];
  rateLimit?: number;
  isActive?: boolean;
}

export class ApiKeyService {
  /**
   * Generate a new API key
   */
  async createApiKey(input: CreateApiKeyInput): Promise<{ apiKey: ApiKey; plainKey: string }> {
    // Validate that either userId or organizationId is provided
    if (!input.userId && !input.organizationId) {
      throw new AppError('Either userId or organizationId must be provided', 400);
    }

    // Generate random API key
    const plainKey = this.generateKey();
    const hashedKey = await hashPassword(plainKey);

    // Create key prefix for display (e.g., "sk_live_abc12345")
    const keyPrefix = `sk_${process.env.NODE_ENV === 'production' ? 'live' : 'test'}_${plainKey.substring(0, 8)}`;

    // Create API key in database
    const apiKey = await prisma.apiKey.create({
      data: {
        name: input.name,
        key: hashedKey,
        keyPrefix,
        userId: input.userId,
        organizationId: input.organizationId,
        scopes: input.scopes,
        rateLimit: input.rateLimit || 1000,
        expiresAt: input.expiresAt,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: 'api_key.created',
        resource: 'api_key',
        resourceId: apiKey.id,
        metadata: {
          keyPrefix,
          scopes: input.scopes,
          organizationId: input.organizationId,
        },
      },
    });

    return { apiKey, plainKey };
  }

  /**
   * Get API keys for user or organization
   */
  async getApiKeys(userId?: string, organizationId?: string): Promise<ApiKey[]> {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const apiKeys = await prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys;
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(keyId: string, userId?: string, organizationId?: string): Promise<ApiKey> {
    const where: any = { id: keyId };

    if (userId) {
      where.userId = userId;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const apiKey = await prisma.apiKey.findFirst({ where });

    if (!apiKey) {
      throw new AppError('API key not found', 404);
    }

    return apiKey;
  }

  /**
   * Update API key
   */
  async updateApiKey(
    keyId: string,
    input: UpdateApiKeyInput,
    userId?: string,
    organizationId?: string
  ): Promise<ApiKey> {
    // Verify ownership
    await this.getApiKeyById(keyId, userId, organizationId);

    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: input,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'api_key.updated',
        resource: 'api_key',
        resourceId: keyId,
        metadata: input as any,
      },
    });

    return apiKey;
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(
    keyId: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    // Verify ownership
    await this.getApiKeyById(keyId, userId, organizationId);

    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        revokedAt: new Date(),
        isActive: false,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'api_key.revoked',
        resource: 'api_key',
        resourceId: keyId,
      },
    });
  }

  /**
   * Delete API key
   */
  async deleteApiKey(
    keyId: string,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    // Verify ownership
    await this.getApiKeyById(keyId, userId, organizationId);

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'api_key.deleted',
        resource: 'api_key',
        resourceId: keyId,
      },
    });
  }

  /**
   * Verify API key and return key data
   */
  async verifyApiKey(plainKey: string): Promise<ApiKey | null> {
    // Get all active API keys
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
        revokedAt: null,
      },
    });

    // Find matching key by comparing hashes
    for (const apiKey of apiKeys) {
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(plainKey, apiKey.key);

      if (isMatch) {
        // Check if expired
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          throw new AppError('API key has expired', 401);
        }

        // Update last used timestamp and usage count
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            lastUsedAt: new Date(),
            usageCount: { increment: 1 },
          },
        });

        return apiKey;
      }
    }

    return null;
  }

  /**
   * Rotate API key (generate new key, revoke old one)
   */
  async rotateApiKey(
    keyId: string,
    userId?: string,
    organizationId?: string
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    // Get existing key
    const oldKey = await this.getApiKeyById(keyId, userId, organizationId);

    // Create new key with same properties
    const newKeyData = await this.createApiKey({
      name: `${oldKey.name} (Rotated)`,
      userId: oldKey.userId || undefined,
      organizationId: oldKey.organizationId || undefined,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit || undefined,
      expiresAt: oldKey.expiresAt || undefined,
    });

    // Revoke old key
    await this.revokeApiKey(keyId, userId, organizationId);

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'api_key.rotated',
        resource: 'api_key',
        resourceId: newKeyData.apiKey.id,
        metadata: {
          oldKeyId: keyId,
          newKeyId: newKeyData.apiKey.id,
        },
      },
    });

    return newKeyData;
  }

  /**
   * Validate API key and return user info
   */
  async validateApiKey(plainKey: string): Promise<ApiKey | null> {
    try {
      // Get all active API keys
      const apiKeys = await prisma.apiKey.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      // Check each key (we need to compare hashes)
      for (const apiKey of apiKeys) {
        const isValid = await comparePassword(plainKey, apiKey.key);
        if (isValid) {
          // Update last used timestamp
          await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          });

          return apiKey;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKey: ApiKey): Promise<boolean> {
    if (!apiKey.rateLimit) {
      return true; // No rate limit
    }

    // Check usage in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Count audit logs for this API key in the last hour
    const usageCount = await prisma.auditLog.count({
      where: {
        resource: 'api_key',
        resourceId: apiKey.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    return usageCount < apiKey.rateLimit;
  }

  /**
   * Generate random API key
   */
  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export const apiKeyService = new ApiKeyService();
