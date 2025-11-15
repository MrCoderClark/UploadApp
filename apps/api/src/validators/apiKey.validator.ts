import { z } from 'zod';

// The validate() middleware passes an object shaped as { body, query, params } into Zod.
// To correctly validate API key payloads, schemas must be nested under `body`,
// similar to the auth validators.

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'API key name is required').max(100),
    organizationId: z.string().uuid().optional(),
    scopes: z.array(z.string()).min(1, 'At least one scope is required'),
    rateLimit: z.number().int().positive().optional(),
    expiresAt: z
      .string()
      .datetime()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
  }),
});

export const updateApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    scopes: z.array(z.string()).min(1).optional(),
    rateLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
