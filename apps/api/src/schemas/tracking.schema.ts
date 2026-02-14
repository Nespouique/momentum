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
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
