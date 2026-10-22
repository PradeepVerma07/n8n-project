import { POST_STATUS } from '../constants/post-status.js';

/**
 * Strict state machine map of allowed status transitions.
 * Plain JS object map.
 */
export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  [POST_STATUS.DRAFT]: [
    POST_STATUS.PENDING_APPROVAL,
    POST_STATUS.APPROVED,
    POST_STATUS.SCHEDULED,
    POST_STATUS.CANCELLED,
  ],
  [POST_STATUS.PENDING_APPROVAL]: [
    POST_STATUS.APPROVED,
    POST_STATUS.DRAFT,
    POST_STATUS.CANCELLED,
  ],
  [POST_STATUS.APPROVED]: [
    POST_STATUS.SCHEDULED,
    POST_STATUS.DRAFT,
    POST_STATUS.CANCELLED,
  ],
  [POST_STATUS.SCHEDULED]: [
    POST_STATUS.QUEUED,
    POST_STATUS.FAILED, // If missed window or validation fails
    POST_STATUS.CANCELLED,
    POST_STATUS.DRAFT,
  ],
  [POST_STATUS.QUEUED]: [
    POST_STATUS.PUBLISHING,
    POST_STATUS.FAILED,
    POST_STATUS.CANCELLED,
  ],
  [POST_STATUS.PUBLISHING]: [
    POST_STATUS.PUBLISHED,
    POST_STATUS.PARTIALLY_PUBLISHED,
    POST_STATUS.FAILED,
  ],
  [POST_STATUS.PUBLISHED]: [], // Terminal state
  [POST_STATUS.PARTIALLY_PUBLISHED]: [
    POST_STATUS.QUEUED, // If re-trying failed platform
    POST_STATUS.PUBLISHING,
  ],
  [POST_STATUS.FAILED]: [
    POST_STATUS.SCHEDULED, // If user re-schedules/retries
    POST_STATUS.DRAFT,
  ],
  [POST_STATUS.CANCELLED]: [
    POST_STATUS.DRAFT,
  ],
});

/**
 * Validates whether a state transition from `currentStatus` to `nextStatus` is permissible.
 *
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return { valid: true };
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) {
    return {
      valid: false,
      error: `Unknown current status: "${currentStatus}"`,
    };
  }

  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from "${currentStatus}" to "${nextStatus}". Allowed: [${allowed.join(', ')}]`,
    };
  }

  return { valid: true };
}

/**
 * Convenience helper returning boolean if transition is valid.
 *
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
export function canTransition(currentStatus, nextStatus) {
  return validateStatusTransition(currentStatus, nextStatus).valid;
}
