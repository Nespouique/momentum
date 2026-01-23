import { z } from "zod";

// Start session
export const createSessionSchema = z.object({
  workoutId: z.string().uuid("Invalid workout ID"),
});

// Update session (status change or notes)
export const updateSessionSchema = z.object({
  status: z.enum(["completed", "abandoned"]).optional(),
  notes: z.string().max(1000, "Notes must be at most 1000 characters").optional(),
});

// Session list query
export const sessionQuerySchema = z.object({
  status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
  workoutId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Update session exercise (skip)
export const updateSessionExerciseSchema = z.object({
  status: z.literal("skipped"),
});

// Substitute exercise
export const substituteExerciseSchema = z.object({
  newExerciseId: z.string().uuid("Invalid exercise ID"),
});

// Reorder exercises
export const reorderExercisesSchema = z.object({
  exerciseIds: z.array(z.string().uuid()).min(1, "At least 1 exercise ID required"),
});

// Record set result
export const recordSetResultSchema = z.object({
  setNumber: z.number().int().positive("Set number must be positive"),
  actualReps: z.number().int().min(0, "Reps must be non-negative").max(100, "Reps must be at most 100"),
  actualWeight: z.number().min(0, "Weight must be non-negative").max(1000, "Weight must be at most 1000"),
  rpe: z.number().int().min(1, "RPE must be at least 1").max(10, "RPE must be at most 10").optional(),
});

// Update set
export const updateSetSchema = z.object({
  actualReps: z.number().int().min(0).max(100).optional(),
  actualWeight: z.number().min(0).max(1000).optional(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
});

// Last session query
export const lastSessionQuerySchema = z.object({
  workoutId: z.string().uuid("workoutId is required"),
});

// Export types
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SessionQueryInput = z.infer<typeof sessionQuerySchema>;
export type UpdateSessionExerciseInput = z.infer<typeof updateSessionExerciseSchema>;
export type SubstituteExerciseInput = z.infer<typeof substituteExerciseSchema>;
export type ReorderExercisesInput = z.infer<typeof reorderExercisesSchema>;
export type RecordSetResultInput = z.infer<typeof recordSetResultSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type LastSessionQueryInput = z.infer<typeof lastSessionQuerySchema>;
