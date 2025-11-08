import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100),
  organizationId: z.string().uuid().optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  rateLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  rateLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
