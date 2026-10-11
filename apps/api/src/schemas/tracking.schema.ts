import { z } from "zod";

// --- Query schemas ---

export const trackingEntriesQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  trackableId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const trackingSummaryQuerySchema = z.object({
  period: z.enum(["week", "month"]).default("week"),
  date: z.coerce.date().optional(), // defaults to today if not provided
});

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isBrowserLocalMidnight(instant: string, dateKey: string): boolean {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!dateMatch) return false;
  const wallMidnightUtc = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3])
  );
  const offsetMinutes = (wallMidnightUtc - Date.parse(instant)) / 60_000;
  return (
    Number.isInteger(offsetMinutes) &&
    Math.abs(offsetMinutes) <= 14 * 60 &&
    offsetMinutes % 15 === 0
  );
}

function getMondayDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function getNextDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + 1)).toISOString().slice(0, 10);
}

const dateKeySchema = z
  .string()
  .refine(isCalendarDate, "Date must be a valid YYYY-MM-DD calendar date");
const timestampSchema = z.string().datetime({ offset: true });

export const dailyTrackingQuerySchema = z
  .object({
    date: dateKeySchema.optional(),
    dayStart: timestampSchema.optional(),
    nextDayStart: timestampSchema.optional(),
    weekStart: timestampSchema.optional(),
    monthStart: timestampSchema.optional(),
    weekDateStart: dateKeySchema.optional(),
    monthDateStart: dateKeySchema.optional(),
  })
  .superRefine((query, context) => {
    const bounds = [
      query.dayStart,
      query.nextDayStart,
      query.weekStart,
      query.monthStart,
      query.weekDateStart,
      query.monthDateStart,
    ];
    const hasContext = query.date !== undefined || bounds.some((bound) => bound !== undefined);
    if (hasContext && (!query.date || bounds.some((bound) => bound === undefined))) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: "Date and all calendar bounds are required together",
      });
      return;
    }
    if (
      !query.dayStart ||
      !query.nextDayStart ||
      !query.weekStart ||
      !query.monthStart ||
      !query.weekDateStart ||
      !query.monthDateStart
    )
      return;

    const date = query.date;
    const dayStartInstant = query.dayStart;
    const nextDayStartInstant = query.nextDayStart;
    const weekStartInstant = query.weekStart;
    const monthStartInstant = query.monthStart;
    const weekDateStart = query.weekDateStart;
    const monthDateStart = query.monthDateStart;
    if (
      !date ||
      !dayStartInstant ||
      !nextDayStartInstant ||
      !weekStartInstant ||
      !monthStartInstant ||
      !weekDateStart ||
      !monthDateStart
    )
      return;

    const dayStart = Date.parse(dayStartInstant);
    const nextDayStart = Date.parse(nextDayStartInstant);
    const dayLength = nextDayStart - dayStart;
    if (dayLength < 22 * 60 * 60 * 1000 || dayLength > 26 * 60 * 60 * 1000) {
      context.addIssue({
        code: "custom",
        path: ["nextDayStart"],
        message: "Day bounds must describe one local calendar day",
      });
    }
    const weekStart = Date.parse(weekStartInstant);
    const monthStart = Date.parse(monthStartInstant);
    if (
      !isBrowserLocalMidnight(dayStartInstant, date) ||
      !isBrowserLocalMidnight(nextDayStartInstant, getNextDateKey(date)) ||
      !isBrowserLocalMidnight(weekStartInstant, weekDateStart) ||
      !isBrowserLocalMidnight(monthStartInstant, monthDateStart) ||
      Math.abs((weekStart - Date.parse(`${weekDateStart}T00:00:00.000Z`)) / 60_000) > 14 * 60 ||
      Math.abs((monthStart - Date.parse(`${monthDateStart}T00:00:00.000Z`)) / 60_000) > 14 * 60 ||
      weekDateStart !== getMondayDateKey(date) ||
      monthDateStart !== `${date.slice(0, 7)}-01` ||
      weekStart > dayStart ||
      monthStart > dayStart
    ) {
      context.addIssue({
        code: "custom",
        path: ["dayStart"],
        message: "Period starts cannot be after the selected day",
      });
    }
    if (
      new Date(`${weekDateStart}T00:00:00.000Z`).getUTCDay() !== 1 ||
      new Date(`${monthDateStart}T00:00:00.000Z`).getUTCDate() !== 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["weekDateStart"],
        message: "Date periods must start at calendar boundaries",
      });
    }
  });

// --- Entry schemas ---

export const createEntrySchema = z.object({
  trackableId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  value: z.number(),
  notes: z.string().optional(),
});

// --- Exported types ---

export type TrackingEntriesQueryInput = z.infer<typeof trackingEntriesQuerySchema>;
export type TrackingSummaryQueryInput = z.infer<typeof trackingSummaryQuerySchema>;
export type DailyTrackingQueryInput = z.infer<typeof dailyTrackingQuerySchema>;
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
