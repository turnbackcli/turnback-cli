import { logger } from '../logs/logger';

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  onRetry: () => {}
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let currentDelay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === opts.maxAttempts) {
        break;
      }

      const isRetryable = isRetryableError(error);
      if (!isRetryable) {
        throw error;
      }

      logger.debug(`Attempt ${attempt} failed, retrying in ${currentDelay}ms...`, { error: error.message });
      opts.onRetry(attempt, error);

      await sleep(currentDelay);
      currentDelay = Math.min(currentDelay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

function isRetryableError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  
  // RPC errors that are retryable
  const retryablePatterns = [
    'timeout',
    'econnreset',
    'enotfound',
    'econnrefused',
    '429',
    'too many requests',
    'rate limit',
    'blockhash not found',
    'node is unhealthy'
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
