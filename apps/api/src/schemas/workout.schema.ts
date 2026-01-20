import { z } from "zod";

// WorkoutSet schema
const workoutSetSchema = z.object({
  setNumber: z.number().int().min(1, "Set number must be at least 1"),
  targetReps: z
    .number()
    .int()
    .min(1, "Reps must be at least 1")
    .max(100, "Reps must be at most 100"),
  targetWeight: z.number().min(0).max(500).nullable().optional(),
});

// WorkoutItemExercise schema
const workoutItemExerciseSchema = z.object({
  exerciseId: z.string().uuid("Invalid exercise ID"),
  position: z.number().int().min(1, "Position must be at least 1"),
  restBetweenSets: z
    .number()
    .int()
    .min(0, "Rest must be non-negative")
    .max(600, "Rest must be at most 10 minutes"),
  sets: z.array(workoutSetSchema).min(1, "At least 1 set is required"),
});

// WorkoutItem schema with refinement for type validation
const workoutItemSchema = z
  .object({
    type: z.enum(["exercise", "superset"]),
    position: z.number().int().min(1, "Position must be at least 1"),
    rounds: z
      .number()
      .int()
      .min(1, "Rounds must be at least 1")
      .max(10, "Rounds must be at most 10"),
    restAfter: z
      .number()
      .int()
      .min(0, "Rest must be non-negative")
      .max(600, "Rest must be at most 10 minutes"),
    exercises: z.array(workoutItemExerciseSchema).min(1),
  })
  .refine(
    (data) => {
      if (data.type === "exercise") return data.exercises.length === 1;
      if (data.type === "superset") return data.exercises.length >= 2;
      return false;
    },
    {
      message:
        "Simple exercise must have exactly 1 exercise. Superset must have at least 2 exercises.",
      path: ["exercises"],
    }
  );

// Create workout schema
export const createWorkoutSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  items: z
    .array(workoutItemSchema)
    .min(1, "At least 1 exercise or superset is required"),
});

// Update workout schema (same as create, replaces everything)
export const updateWorkoutSchema = createWorkoutSchema;

// Query schema for listing workouts
export const workoutQuerySchema = z.object({
  search: z.string().optional(),
});

// Export types
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type WorkoutQueryInput = z.infer<typeof workoutQuerySchema>;
export type WorkoutItemInput = z.infer<typeof workoutItemSchema>;
export type WorkoutItemExerciseInput = z.infer<typeof workoutItemExerciseSchema>;
export type WorkoutSetInput = z.infer<typeof workoutSetSchema>;
