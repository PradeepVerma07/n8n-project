import { describe, it, expect } from 'vitest';
import { validateStatusTransition } from '../src/utils/state-machine.js';
import { POST_STATUS } from '../src/constants/post-status.js';

describe('State Machine Validator (@postpilot/shared)', () => {
  it('allows same-status identity transition (no-op)', () => {
    const res = validateStatusTransition(POST_STATUS.SCHEDULED, POST_STATUS.SCHEDULED);
    expect(res.valid).toBe(true);
  });

  it('allows valid progressive flow: Scheduled -> Queued -> Publishing -> Published', () => {
    expect(validateStatusTransition(POST_STATUS.SCHEDULED, POST_STATUS.QUEUED).valid).toBe(true);
    expect(validateStatusTransition(POST_STATUS.QUEUED, POST_STATUS.PUBLISHING).valid).toBe(true);
    expect(validateStatusTransition(POST_STATUS.PUBLISHING, POST_STATUS.PUBLISHED).valid).toBe(true);
  });

  it('allows Publishing -> Partially Published or Failed', () => {
    expect(validateStatusTransition(POST_STATUS.PUBLISHING, POST_STATUS.PARTIALLY_PUBLISHED).valid).toBe(true);
    expect(validateStatusTransition(POST_STATUS.PUBLISHING, POST_STATUS.FAILED).valid).toBe(true);
  });

  it('rejects invalid jump: Draft directly to Published', () => {
    const res = validateStatusTransition(POST_STATUS.DRAFT, POST_STATUS.PUBLISHED);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Invalid status transition/);
  });

  it('rejects invalid jump: Published to Draft (terminal state)', () => {
    const res = validateStatusTransition(POST_STATUS.PUBLISHED, POST_STATUS.DRAFT);
    expect(res.valid).toBe(false);
  });

  it('rejects invalid jump: Queued directly to Published', () => {
    const res = validateStatusTransition(POST_STATUS.QUEUED, POST_STATUS.PUBLISHED);
    expect(res.valid).toBe(false);
  });
});
