import { zodResolver as originalZodResolver } from '@hookform/resolvers/zod';

/**
 * Re-export zodResolver from @hookform/resolvers/zod
 * 
 * Note: There may be TypeScript errors due to version incompatibility between
 * Zod v3.24+ and @hookform/resolvers. These are type-level only and don't
 * affect runtime behavior. The errors can be suppressed with @ts-expect-error.
 */
export const zodResolver = originalZodResolver;
