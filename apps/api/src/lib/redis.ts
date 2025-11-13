import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Redis client only if REDIS_URL is provided
const redis = config.redis.url
  ? new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    })
  : null;

if (redis) {
  redis.on('connect', () => {
    logger.info('✓ Redis connected');
  });

  redis.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });
} else {
  logger.warn('⚠️ Redis URL not provided - running without Redis cache');
}

export default redis;
