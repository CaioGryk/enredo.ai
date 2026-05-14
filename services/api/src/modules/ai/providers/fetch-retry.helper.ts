import { Logger } from '@nestjs/common';

const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface RetryConfig {
  maxAttempts: number;
  onRetry?: (attempt: number, error: Error, statusCode?: number) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger?: Logger,
  contextLabel?: string,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  let lastStatusCode: number | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxAttempts) {
        break;
      }

      if (!isRetryableError(lastError)) {
        break;
      }

      lastStatusCode = extractStatusCode(lastError);

      if (logger) {
        logger.warn(`Transient failure${lastStatusCode ? ` (status ${lastStatusCode})` : ''}, retrying (attempt ${attempt + 1}/${config.maxAttempts})${contextLabel ? ` [${contextLabel}]` : ''}`);
      }

      config.onRetry?.(attempt, lastError, lastStatusCode);
    }
  }

  throw lastError;
}

function isRetryableError(error: Error): boolean {
  if (error.message.includes('API error: status')) {
    const statusMatch = error.message.match(/status (\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return TRANSIENT_STATUS_CODES.has(status);
    }
  }

  if (error.message.includes('fetch failed') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
    return true;
  }

  return false;
}

function extractStatusCode(error: Error): number | undefined {
  const statusMatch = error.message.match(/status (\d+)/);
  if (statusMatch) {
    return parseInt(statusMatch[1], 10);
  }
  return undefined;
}

export function isAuthError(statusCode: number): boolean {
  return statusCode === 401 || statusCode === 403;
}

export function isTransientError(statusCode: number): boolean {
  return TRANSIENT_STATUS_CODES.has(statusCode);
}