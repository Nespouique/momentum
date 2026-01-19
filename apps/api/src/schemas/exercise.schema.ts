import { z } from "zod";
import { MUSCLE_GROUPS } from "@momentum/shared";

export const createExerciseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  muscleGroups: z
    .array(z.enum(MUSCLE_GROUPS))
    .min(1, "At least one muscle group is required"),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  muscleGroups: z.array(z.enum(MUSCLE_GROUPS)).min(1).optional(),
});

export const exerciseQuerySchema = z.object({
  muscleGroup: z.enum(MUSCLE_GROUPS).optional(),
  search: z.string().optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type ExerciseQueryInput = z.infer<typeof exerciseQuerySchema>;
