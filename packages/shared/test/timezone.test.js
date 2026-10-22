import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  parseLocalToUtc,
  isPostDue,
  evaluatePostDueStatus,
  formatUtcToLocal,
} from '../src/utils/timezone.js';

describe('Timezone Utilities (@postpilot/shared)', () => {
  describe('parseLocalToUtc', () => {
    it('correctly converts Asia/Kolkata (+05:30) local time to UTC', () => {
      // 18:30 IST is 13:00 UTC
      const result = parseLocalToUtc('2026-11-01', '18:30', 'Asia/Kolkata');
      expect(result.isoUtc).toBe('2026-11-01T13:00:00.000Z');
      expect(result.adjustedForDst).toBe(false);
    });

    it('correctly converts Asia/Kathmandu (+05:45) local time to UTC', () => {
      // 18:45 Kathmandu is 13:00 UTC
      const result = parseLocalToUtc('2026-11-01', '18:45', 'Asia/Kathmandu');
      expect(result.isoUtc).toBe('2026-11-01T13:00:00.000Z');
      expect(result.adjustedForDst).toBe(false);
    });

    it('handles America/New_York standard time (EST, UTC-5 in winter)', () => {
      // 2026-01-15 10:00 EST -> 15:00 UTC
      const result = parseLocalToUtc('2026-01-15', '10:00', 'America/New_York');
      expect(result.isoUtc).toBe('2026-01-15T15:00:00.000Z');
      expect(result.adjustedForDst).toBe(false);
    });

    it('handles America/New_York daylight saving time (EDT, UTC-4 in summer)', () => {
      // 2026-06-15 10:00 EDT -> 14:00 UTC
      const result = parseLocalToUtc('2026-06-15', '10:00', 'America/New_York');
      expect(result.isoUtc).toBe('2026-06-15T14:00:00.000Z');
      expect(result.adjustedForDst).toBe(false);
    });

    it('handles Europe/London standard (GMT, UTC+0 in winter) vs summer (BST, UTC+1 in summer)', () => {
      const winter = parseLocalToUtc('2026-01-15', '12:00', 'Europe/London');
      expect(winter.isoUtc).toBe('2026-01-15T12:00:00.000Z');

      const summer = parseLocalToUtc('2026-07-15', '12:00', 'Europe/London');
      expect(summer.isoUtc).toBe('2026-07-15T11:00:00.000Z');
    });

    it('handles Australia/Sydney southern hemisphere DST (+11 in Jan, +10 in July)', () => {
      const summerInSydney = parseLocalToUtc('2026-01-15', '10:00', 'Australia/Sydney');
      expect(summerInSydney.isoUtc).toBe('2026-01-14T23:00:00.000Z');

      const winterInSydney = parseLocalToUtc('2026-07-15', '10:00', 'Australia/Sydney');
      expect(winterInSydney.isoUtc).toBe('2026-07-15T00:00:00.000Z');
    });

    it('detects and handles nonexistent local time gap (spring-forward) by shifting forward', () => {
      // In America/New_York, DST starts March 8, 2026. At 2:00 AM, clocks jump to 3:00 AM.
      // 2:30 AM does NOT exist.
      const result = parseLocalToUtc('2026-03-08', '02:30', 'America/New_York');
      expect(result.adjustedForDst).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.dateTimeUtc.isValid).toBe(true);
    });

    it('throws descriptive error on invalid IANA timezone', () => {
      expect(() => parseLocalToUtc('2026-11-01', '18:30', 'Invalid/Zone')).toThrow(
        /Invalid IANA timezone/
      );
    });
  });

  describe('isPostDue', () => {
    const nowUtc = DateTime.fromISO('2026-11-01T12:05:00.000Z');

    it('returns true when post scheduledUtc is within 10-minute lookback window', () => {
      // Scheduled 2 minutes ago
      const postTime = '2026-11-01T12:03:00.000Z';
      expect(isPostDue(postTime, nowUtc, 10)).toBe(true);
    });

    it('returns true when post scheduledUtc is exactly at now', () => {
      expect(isPostDue('2026-11-01T12:05:00.000Z', nowUtc, 10)).toBe(true);
    });

    it('returns false when post is scheduled in the future', () => {
      const futurePost = '2026-11-01T12:06:00.000Z';
      expect(isPostDue(futurePost, nowUtc, 10)).toBe(false);
    });

    it('returns false when post is older than the 10-minute lookback window', () => {
      // 15 minutes ago
      const oldPost = '2026-11-01T11:50:00.000Z';
      expect(isPostDue(oldPost, nowUtc, 10)).toBe(false);
    });
  });

  describe('evaluatePostDueStatus', () => {
    const nowUtc = DateTime.fromISO('2026-11-01T12:05:00.000Z');

    it('identifies future posts', () => {
      const res = evaluatePostDueStatus('2026-11-01T12:10:00.000Z', nowUtc, 10);
      expect(res.isDue).toBe(false);
      expect(res.state).toBe('PENDING_FUTURE');
    });

    it('identifies due posts within window', () => {
      const res = evaluatePostDueStatus('2026-11-01T12:04:00.000Z', nowUtc, 10);
      expect(res.isDue).toBe(true);
      expect(res.state).toBe('DUE');
    });

    it('identifies missed window posts when autoPublishMissed is false', () => {
      const res = evaluatePostDueStatus('2026-11-01T11:45:00.000Z', nowUtc, 10, false);
      expect(res.isDue).toBe(false);
      expect(res.state).toBe('MISSED_WINDOW');
    });

    it('allows publishing missed window posts when autoPublishMissed is true', () => {
      const res = evaluatePostDueStatus('2026-11-01T11:45:00.000Z', nowUtc, 10, true);
      expect(res.isDue).toBe(true);
      expect(res.state).toBe('DUE');
    });
  });

  describe('formatUtcToLocal', () => {
    it('formats UTC to target timezone nicely', () => {
      const utc = '2026-11-01T13:00:00.000Z';
      const formatted = formatUtcToLocal(utc, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
      expect(formatted).toBe('2026-11-01 18:30');
    });
  });
});
