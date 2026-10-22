import { DateTime, IANAZone } from 'luxon';

/**
 * Parses local date and time string in a given IANA timezone into a UTC DateTime object.
 * Handles DST spring-forward gaps (nonexistent local times) by shifting forward to the next valid instant.
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:mm or HH:mm:ss 24h format
 * @param {string} timezone - Valid IANA timezone name (e.g. "Asia/Kolkata", "America/New_York")
 * @returns {{ dateTimeUtc: DateTime, isoUtc: string, adjustedForDst: boolean, warning?: string }}
 */
export function parseLocalToUtc(dateStr, timeStr, timezone) {
  if (!dateStr || !timeStr || !timezone) {
    throw new Error('dateStr, timeStr, and timezone are required');
  }

  const cleanZone = timezone.trim();
  if (!IANAZone.isValidZone(cleanZone)) {
    throw new Error(`Invalid IANA timezone: "${timezone}"`);
  }

  // Normalize time string to ensure seconds component exists
  const normalizedTime = timeStr.trim().length === 5 ? `${timeStr.trim()}:00` : timeStr.trim();
  const isoLocalString = `${dateStr.trim()}T${normalizedTime}`;

  let dt = DateTime.fromISO(isoLocalString, { zone: cleanZone });

  if (!dt.isValid) {
    throw new Error(`Invalid date/time combination: ${isoLocalString} (${dt.invalidReason})`);
  }

  // Check for DST gap (spring-forward nonexistent time)
  // Example: 2026-03-08T02:30:00 in America/New_York jumps from 02:00 to 03:00
  const requestedHour = parseInt(timeStr.split(':')[0], 10);
  const adjustedForDst = dt.hour !== requestedHour;
  let warning;

  if (adjustedForDst) {
    warning = `Local time ${isoLocalString} does not exist in timezone ${cleanZone} due to DST transition; shifted forward to ${dt.toFormat('HH:mm:ss')}.`;
  }

  const dtUtc = dt.toUTC();

  return {
    dateTimeUtc: dtUtc,
    isoUtc: dtUtc.toISO(),
    adjustedForDst,
    warning,
  };
}

/**
 * Convenience helper to compute a JavaScript Date object in UTC from local date, time, and timezone.
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:mm or HH:mm:ss format
 * @param {string} timezone - Valid IANA timezone name
 * @returns {Date} UTC Date object
 */
export function computeScheduledUtc(dateStr, timeStr, timezone) {
  const { dateTimeUtc } = parseLocalToUtc(dateStr, timeStr, timezone);
  return dateTimeUtc.toJSDate();
}

/**
 * Checks whether a scheduled UTC time is due for publication.
 *
 * Rule:
 * scheduled_utc <= now_utc AND scheduled_utc >= (now_utc - lookbackMinutes)
 *
 * @param {string|Date|DateTime} scheduledUtc - Scheduled time in UTC
 * @param {string|Date|DateTime} [nowUtc] - Reference current UTC time (defaults to now)
 * @param {number} [lookbackMinutes=10] - Look-back window in minutes
 * @returns {boolean}
 */
export function isPostDue(scheduledUtc, nowUtc, lookbackMinutes = 10) {
  const sched = scheduledUtc instanceof DateTime ? scheduledUtc : DateTime.fromISO(new Date(scheduledUtc).toISOString()).toUTC();
  const now = nowUtc
    ? (nowUtc instanceof DateTime ? nowUtc : DateTime.fromISO(new Date(nowUtc).toISOString()).toUTC())
    : DateTime.utc();

  const lookbackBoundary = now.minus({ minutes: lookbackMinutes });

  return sched <= now && sched >= lookbackBoundary;
}

/**
 * Evaluates the due status of a scheduled post.
 * Categorizes whether it is:
 * - 'DUE': Scheduled for now within the window
 * - 'PENDING_FUTURE': Scheduled for the future
 * - 'MISSED_WINDOW': Passed and older than the lookback window
 *
 * @param {string|Date|DateTime} scheduledUtc
 * @param {string|Date|DateTime} [nowUtc]
 * @param {number} [lookbackMinutes=10]
 * @param {boolean} [autoPublishMissed=false]
 * @returns {{ isDue: boolean, state: 'DUE' | 'PENDING_FUTURE' | 'MISSED_WINDOW', message?: string }}
 */
export function evaluatePostDueStatus(scheduledUtc, nowUtc, lookbackMinutes = 10, autoPublishMissed = false) {
  const sched = scheduledUtc instanceof DateTime ? scheduledUtc : DateTime.fromISO(new Date(scheduledUtc).toISOString()).toUTC();
  const now = nowUtc
    ? (nowUtc instanceof DateTime ? nowUtc : DateTime.fromISO(new Date(nowUtc).toISOString()).toUTC())
    : DateTime.utc();

  if (sched > now) {
    return { isDue: false, state: 'PENDING_FUTURE' };
  }

  const lookbackBoundary = now.minus({ minutes: lookbackMinutes });

  if (sched >= lookbackBoundary) {
    return { isDue: true, state: 'DUE' };
  }

  // Older than lookback window
  if (autoPublishMissed) {
    return {
      isDue: true,
      state: 'DUE',
      message: 'Post is past the lookback window but auto_publish_missed is enabled',
    };
  }

  return {
    isDue: false,
    state: 'MISSED_WINDOW',
    message: `Scheduled time (${sched.toISO()}) is older than the ${lookbackMinutes}-minute lookback window`,
  };
}

/**
 * Formats a UTC timestamp into a human-readable local time for any target timezone.
 *
 * @param {string|Date} utcDate - ISO date or Date object
 * @param {string} targetTimezone - Target IANA timezone
 * @param {string} [formatStr='yyyy-MM-dd HH:mm:ss (ZZZZ)'] - Luxon format pattern
 * @returns {string}
 */
export function formatUtcToLocal(utcDate, targetTimezone, formatStr = 'yyyy-MM-dd HH:mm:ss (ZZZZ)') {
  if (!utcDate) return '';
  const dt = DateTime.fromISO(new Date(utcDate).toISOString()).setZone(targetTimezone);
  return dt.toFormat(formatStr);
}
