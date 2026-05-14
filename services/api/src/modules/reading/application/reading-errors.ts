import { HttpException, HttpStatus } from '@nestjs/common';

export const ReadingErrorCode = {
  READING_SESSION_NOT_FOUND: 'READING_SESSION_NOT_FOUND',
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',
  PREMIUM_REQUIRED: 'PREMIUM_REQUIRED',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  MODEL_ACCESS_DENIED: 'MODEL_ACCESS_DENIED',
  INVALID_READING_ACTION: 'INVALID_READING_ACTION',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  READING_GENERATION_FAILED: 'READING_GENERATION_FAILED',
} as const;

export function throwReadingError(
  message: string,
  code: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
): never {
  throw new HttpException({ message, error: code }, status);
}

export function throwBudgetDenied(blockReason: string): never {
  if (blockReason.includes('Daily interaction limit')) {
    return throwReadingError(
      'Daily reading limit reached.',
      ReadingErrorCode.DAILY_LIMIT_REACHED,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
  if (blockReason.includes('Requires Premium')) {
    return throwReadingError(
      'This story requires a Premium subscription.',
      ReadingErrorCode.PREMIUM_REQUIRED,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
  if (blockReason.toLowerCase().includes('credits') || blockReason.toLowerCase().includes('credit')) {
    return throwReadingError(
      'Insufficient credits for this model.',
      ReadingErrorCode.INSUFFICIENT_CREDITS,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
  return throwReadingError(
    blockReason || 'Model access denied.',
    ReadingErrorCode.MODEL_ACCESS_DENIED,
    HttpStatus.FORBIDDEN,
  );
}
