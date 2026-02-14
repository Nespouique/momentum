import { z } from "zod";

// --- Create trackable schema ---

export const createTrackableSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g., #22C55E)"),
  trackingType: z.enum(["boolean", "number", "duration"]),
  unit: z.string().optional(),
});

// --- Update trackable schema ---

export const updateTrackableSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// --- Create goal schema ---

export const createGoalSchema = z.object({
  targetValue: z.number().positive("Target value must be positive"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
});

// --- Update goal schema ---

export const updateGoalSchema = z.object({
  targetValue: z.number().positive().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  endDate: z.string().datetime().optional(),
});

// --- Reorder schema ---

export const reorderTrackablesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
    })
  ),
});

// --- Suggest icons schema ---

export const suggestIconsSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
});

export type SuggestIconsInput = z.infer<typeof suggestIconsSchema>;

// --- Exported types ---

export type CreateTrackableInput = z.infer<typeof createTrackableSchema>;
export type UpdateTrackableInput = z.infer<typeof updateTrackableSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ReorderTrackablesInput = z.infer<typeof reorderTrackablesSchema>;
