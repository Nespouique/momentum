import { z } from "zod";

// --- Sub-schemas ---

export const dailyMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  steps: z.number().int().min(0).nullable(),
  activeCalories: z.number().min(0).nullable(),
  activeMinutes: z.number().min(0).nullable(),
});

export const sleepStageSchema = z.object({
  stage: z.enum(["awake", "light", "deep", "rem", "sleeping"]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export const sleepRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMinutes: z.number().min(0),
  score: z.number().int().min(0).max(100).nullable(),
  stages: z.array(sleepStageSchema).nullable(),
});

export const activityRecordSchema = z.object({
  hcRecordId: z.string().min(1, "Health Connect record ID required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  activityType: z.string().min(1),
  title: z.string().nullable(),
  durationMinutes: z.number().min(0),
  calories: z.number().min(0).nullable(),
  distance: z.number().min(0).nullable(),
  heartRateAvg: z.number().int().min(0).nullable(),
  sourceApp: z.string().nullable(),
});

export const healthSyncRequestSchema = z.object({
  deviceName: z.string().min(1, "Device name is required"),
  syncedAt: z.string().datetime(),
  dailyMetrics: z.array(dailyMetricSchema).default([]),
  activities: z.array(activityRecordSchema).default([]),
  sleepSessions: z.array(sleepRecordSchema).default([]),
});

// --- Activities query schema ---

export const healthActivitiesQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  activityType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// --- Exported types ---

export type DailyMetricInput = z.infer<typeof dailyMetricSchema>;
export type SleepStageInput = z.infer<typeof sleepStageSchema>;
export type SleepRecordInput = z.infer<typeof sleepRecordSchema>;
export type ActivityRecordInput = z.infer<typeof activityRecordSchema>;
export type HealthSyncRequestInput = z.infer<typeof healthSyncRequestSchema>;
export type HealthActivitiesQueryInput = z.infer<typeof healthActivitiesQuerySchema>;
