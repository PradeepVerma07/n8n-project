/**
 * Normalized platform error codes.
 * Ensures consistent handling across all platform adapters and reporting.
 */
export const ERROR_CODES = Object.freeze({
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  MEDIA_INVALID: 'MEDIA_INVALID',
  MEDIA_PROCESSING_TIMEOUT: 'MEDIA_PROCESSING_TIMEOUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DUPLICATE_CONTENT: 'DUPLICATE_CONTENT',
  PLATFORM_ERROR: 'PLATFORM_ERROR',
  MISSED_WINDOW: 'MISSED_WINDOW',
  UNKNOWN: 'UNKNOWN',
});

/**
 * Categorizes whether an error code should trigger worker retries.
 */
export const RETRYABLE_ERROR_CODES = new Set([
  ERROR_CODES.RATE_LIMITED,
  ERROR_CODES.MEDIA_PROCESSING_TIMEOUT,
  ERROR_CODES.PLATFORM_ERROR,
]);
