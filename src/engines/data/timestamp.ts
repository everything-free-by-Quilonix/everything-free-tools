/**
 * Unix Timestamp Converter Engine.
 *
 * Provides bidirectional conversion between Unix epoch timestamps (seconds & milliseconds)
 * and formatted date-time representations.
 */

export interface TimestampInfo {
  seconds: number;
  milliseconds: number;
  iso: string;
  utc: string;
  local: string;
  relative: string;
}

export function fromUnix(value: number, isSeconds = true): TimestampInfo | null {
  const ms = isSeconds ? value * 1000 : value;
  if (!Number.isFinite(ms) || ms < -8640000000000000 || ms > 8640000000000000) {
    return null;
  }

  const date = new Date(ms);
  if (isNaN(date.getTime())) return null;

  return {
    seconds: Math.floor(ms / 1000),
    milliseconds: Math.floor(ms),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" }),
    relative: getRelativeTimeString(date),
  };
}

export function fromIsoOrDate(input: string): TimestampInfo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return null;

  const ms = date.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    milliseconds: ms,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" }),
    relative: getRelativeTimeString(date),
  };
}

function getRelativeTimeString(date: Date): string {
  const now = Date.now();
  const diffSec = Math.round((date.getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDays = Math.round(diffHr / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  return rtf.format(Math.round(diffDays / 365), "year");
}
