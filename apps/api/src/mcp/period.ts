import { DEFAULT_TIMEZONE } from "./config.js";

export const PERIOD_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "last_12_months",
  "all_time",
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const MAX_PERIOD_DAYS = 3660;

export class McpToolError extends Error {}

export interface PeriodInput {
  period?: PeriodPreset | undefined;
  from?: string | undefined;
  to?: string | undefined;
  timezone?: string | undefined;
}

export interface ResolvedPeriod {
  preset: PeriodPreset | "custom";
  timezone: string;
  /** First local day, inclusive (YYYY-MM-DD). */
  from: string;
  /** Last local day, inclusive (YYYY-MM-DD). */
  to: string;
  days: number;
  /** Half-open UTC instant bounds for timestamp columns: [startUtc, endUtc). */
  startUtc: Date;
  endUtc: Date;
  /** Half-open bounds for `@db.Date` columns, stored at UTC midnight: [dateStart, dateEnd). */
  dateStart: Date;
  dateEnd: Date;
}

interface Ymd {
  y: number;
  m: number;
  d: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timezone, formatter);
  }
  return formatter;
}

export function assertValidTimezone(timezone: string): void {
  try {
    getFormatter(timezone);
  } catch {
    throw new McpToolError(
      `Fuseau horaire invalide : "${timezone}". Utilise un identifiant IANA (ex. Europe/Paris).`
    );
  }
}

function zonedParts(date: Date, timezone: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const part of getFormatter(timezone).formatToParts(date)) {
    if (part.type !== "literal") result[part.type] = Number(part.value);
  }
  return result;
}

function offsetMs(date: Date, timezone: string): number {
  const p = zonedParts(date, timezone);
  const asUtc = Date.UTC(
    p["year"]!,
    p["month"]! - 1,
    p["day"]!,
    p["hour"]!,
    p["minute"]!,
    p["second"]!
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant of 00:00 local time for the given calendar day. */
export function localMidnightToUtc({ y, m, d }: Ymd, timezone: string): Date {
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(new Date(guess), timezone);
  const second = guess - offsetMs(new Date(first), timezone);
  return new Date(second);
}

export function localDateKey(date: Date, timezone: string): string {
  const p = zonedParts(date, timezone);
  return toKey({ y: p["year"]!, m: p["month"]!, d: p["day"]! });
}

function toKey({ y, m, d }: Ymd): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Ymd {
  const match = DATE_PATTERN.exec(key);
  if (!match) throw new McpToolError(`Date invalide : "${key}". Format attendu : YYYY-MM-DD.`);
  const ymd = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  const check = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
  if (
    check.getUTCFullYear() !== ymd.y ||
    check.getUTCMonth() !== ymd.m - 1 ||
    check.getUTCDate() !== ymd.d
  ) {
    throw new McpToolError(`Date inexistante : "${key}".`);
  }
  return ymd;
}

function addDays(ymd: Ymd, days: number): Ymd {
  const date = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + days));
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

function addMonths(ymd: Ymd, months: number): Ymd {
  const date = new Date(Date.UTC(ymd.y, ymd.m - 1 + months, 1));
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: 1 };
}

function diffDays(a: Ymd, b: Ymd): number {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

function mondayOf(ymd: Ymd): Ymd {
  const weekday = (new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay() + 6) % 7;
  return addDays(ymd, -weekday);
}

/** Builds a period from inclusive local days. */
function buildPeriod(
  preset: ResolvedPeriod["preset"],
  timezone: string,
  from: Ymd,
  toInclusive: Ymd
): ResolvedPeriod {
  const toExclusive = addDays(toInclusive, 1);
  const days = diffDays(from, toExclusive);
  if (days < 1)
    throw new McpToolError("La date de fin doit être postérieure ou égale à la date de début.");
  if (days > MAX_PERIOD_DAYS) {
    throw new McpToolError(`Période trop longue (${days} jours, maximum ${MAX_PERIOD_DAYS}).`);
  }
  return {
    preset,
    timezone,
    from: toKey(from),
    to: toKey(toInclusive),
    days,
    startUtc: localMidnightToUtc(from, timezone),
    endUtc: localMidnightToUtc(toExclusive, timezone),
    dateStart: new Date(Date.UTC(from.y, from.m - 1, from.d)),
    dateEnd: new Date(Date.UTC(toExclusive.y, toExclusive.m - 1, toExclusive.d)),
  };
}

function presetRange(preset: PeriodPreset, today: Ymd): { from: Ymd; to: Ymd } {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case "this_week":
      return { from: mondayOf(today), to: today };
    case "last_week": {
      const start = addDays(mondayOf(today), -7);
      return { from: start, to: addDays(start, 6) };
    }
    case "last_7_days":
      return { from: addDays(today, -6), to: today };
    case "last_30_days":
      return { from: addDays(today, -29), to: today };
    case "last_90_days":
      return { from: addDays(today, -89), to: today };
    case "this_month":
      return { from: { y: today.y, m: today.m, d: 1 }, to: today };
    case "last_month": {
      const start = addMonths({ y: today.y, m: today.m, d: 1 }, -1);
      return { from: start, to: addDays(addMonths(start, 1), -1) };
    }
    case "this_year":
      return { from: { y: today.y, m: 1, d: 1 }, to: today };
    case "last_year":
      return { from: { y: today.y - 1, m: 1, d: 1 }, to: { y: today.y - 1, m: 12, d: 31 } };
    case "last_12_months":
      return { from: addMonths({ y: today.y, m: today.m, d: 1 }, -11), to: today };
    case "all_time":
      return { from: addDays(today, -3650), to: today };
  }
}

export interface ResolveOptions {
  now?: Date;
  defaultPeriod: PeriodPreset;
  defaultTimezone?: string;
}

export function resolvePeriod(input: PeriodInput, options: ResolveOptions): ResolvedPeriod {
  const timezone = input.timezone?.trim() || options.defaultTimezone || DEFAULT_TIMEZONE;
  assertValidTimezone(timezone);
  const now = options.now ?? new Date();
  const today = parseDateKey(localDateKey(now, timezone));

  if (input.from || input.to) {
    if (!input.from) throw new McpToolError('Le paramètre "to" nécessite aussi "from".');
    const from = parseDateKey(input.from);
    const to = input.to ? parseDateKey(input.to) : today;
    return buildPeriod("custom", timezone, from, to);
  }

  const preset = input.period ?? options.defaultPeriod;
  const range = presetRange(preset, today);
  return buildPeriod(preset, timezone, range.from, range.to);
}

/** Shrinks an `all_time` period so it starts at the first known local day. */
export function clampAllTime(period: ResolvedPeriod, firstDay: string | null): ResolvedPeriod {
  if (period.preset !== "all_time" || !firstDay || firstDay <= period.from) return period;
  return buildPeriod("all_time", period.timezone, parseDateKey(firstDay), parseDateKey(period.to));
}

/** Comparable period used for "vs previous period" deltas. */
export function previousPeriod(period: ResolvedPeriod): ResolvedPeriod {
  const from = parseDateKey(period.from);
  const make = (start: Ymd, end: Ymd) => buildPeriod("custom", period.timezone, start, end);

  switch (period.preset) {
    case "this_week":
    case "last_week": {
      const start = addDays(from, -7);
      return make(start, addDays(start, period.days - 1));
    }
    case "this_month":
    case "last_month": {
      const start = addMonths(from, -1);
      const monthEnd = addDays(addMonths(start, 1), -1);
      const end = addDays(start, period.days - 1);
      return make(start, diffDays(end, monthEnd) < 0 ? monthEnd : end);
    }
    case "this_year":
    case "last_year": {
      const start = { y: from.y - 1, m: 1, d: 1 };
      const yearEnd = { y: from.y - 1, m: 12, d: 31 };
      const end = addDays(start, period.days - 1);
      return make(start, diffDays(end, yearEnd) < 0 ? yearEnd : end);
    }
    default: {
      const end = addDays(from, -1);
      return make(addDays(end, -(period.days - 1)), end);
    }
  }
}

export type Granularity = "day" | "week" | "month";

export function autoGranularity(days: number): Granularity {
  if (days <= 45) return "day";
  if (days <= 200) return "week";
  return "month";
}

export interface Bucket {
  /** First local day of the bucket, clipped to the period (YYYY-MM-DD). */
  from: string;
  /** Last local day of the bucket, clipped to the period (YYYY-MM-DD). */
  to: string;
  /** True when the bucket is cut by the period boundaries. */
  partial: boolean;
}

export function buildBuckets(period: ResolvedPeriod, granularity: Granularity): Bucket[] {
  const periodFrom = parseDateKey(period.from);
  const periodTo = parseDateKey(period.to);
  const buckets: Bucket[] = [];

  let cursor =
    granularity === "day"
      ? periodFrom
      : granularity === "week"
        ? mondayOf(periodFrom)
        : { y: periodFrom.y, m: periodFrom.m, d: 1 };

  while (diffDays(cursor, periodTo) >= 0) {
    const natural =
      granularity === "day"
        ? cursor
        : granularity === "week"
          ? addDays(cursor, 6)
          : addDays(addMonths(cursor, 1), -1);
    const start = diffDays(cursor, periodFrom) > 0 ? periodFrom : cursor;
    const end = diffDays(natural, periodTo) < 0 ? periodTo : natural;
    buckets.push({
      from: toKey(start),
      to: toKey(end),
      partial: toKey(start) !== toKey(cursor) || toKey(end) !== toKey(natural),
    });
    cursor =
      granularity === "day"
        ? addDays(cursor, 1)
        : granularity === "week"
          ? addDays(cursor, 7)
          : addMonths(cursor, 1);
  }
  return buckets;
}
