import { Exercise } from "@/lib/api/exercises";

// Form data types for local state management
export interface WorkoutSetFormData {
  id: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
}

export interface WorkoutItemExerciseFormData {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  position: number;
  restBetweenSets: number;
  sets: WorkoutSetFormData[];
  sameRepsForAll: boolean;
  sameWeightForAll: boolean;
}

export interface WorkoutItemFormData {
  id: string;
  type: "exercise" | "superset";
  position: number;
  rounds: number;
  restAfter: number;
  restBetweenRounds: number; // Rest between rounds of superset
  exercises: WorkoutItemExerciseFormData[];
}

export interface WorkoutFormData {
  name: string;
  description: string;
  items: WorkoutItemFormData[];
}

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default values
export const DEFAULT_REST_BETWEEN_SETS = 90; // seconds
export const DEFAULT_REST_AFTER_ITEM = 120; // seconds
export const DEFAULT_REST_BETWEEN_ROUNDS = 60; // seconds (for supersets)
export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const DEFAULT_WEIGHT: number | null = null;
export const DEFAULT_ROUNDS = 3;

// Create default sets for a new exercise
export function createDefaultSets(count: number = DEFAULT_SETS): WorkoutSetFormData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    setNumber: i + 1,
    targetReps: DEFAULT_REPS,
    targetWeight: DEFAULT_WEIGHT,
  }));
}

// Create a new exercise item
export function createExerciseItem(exercise: Exercise): WorkoutItemFormData {
  return {
    id: generateId(),
    type: "exercise",
    position: 0, // Will be set by caller
    rounds: 1,
    restAfter: DEFAULT_REST_AFTER_ITEM,
    restBetweenRounds: 0, // Not used for single exercise
    exercises: [
      {
        id: generateId(),
        exerciseId: exercise.id,
        exercise,
        position: 1,
        restBetweenSets: DEFAULT_REST_BETWEEN_SETS,
        sets: createDefaultSets(),
        sameRepsForAll: true,
        sameWeightForAll: true,
      },
    ],
  };
}

// Create a new superset item
export function createSupersetItem(exercises: Exercise[]): WorkoutItemFormData {
  return {
    id: generateId(),
    type: "superset",
    position: 0, // Will be set by caller
    rounds: DEFAULT_ROUNDS,
    restAfter: DEFAULT_REST_AFTER_ITEM,
    restBetweenRounds: DEFAULT_REST_BETWEEN_ROUNDS,
    exercises: exercises.map((exercise, index) => ({
      id: generateId(),
      exerciseId: exercise.id,
      exercise,
      position: index + 1,
      restBetweenSets: 0, // No rest between exercises in superset
      sets: createDefaultSets(),
      sameRepsForAll: true,
      sameWeightForAll: true,
    })),
  };
}

// Validation
export function isWorkoutValid(workout: WorkoutFormData): boolean {
  if (workout.name.trim().length < 2) return false;
  if (workout.items.length === 0) return false;

  for (const item of workout.items) {
    if (item.type === "superset" && item.exercises.length < 2) return false;
    if (item.type === "exercise" && item.exercises.length !== 1) return false;

    for (const exercise of item.exercises) {
      if (exercise.sets.length === 0) return false;
    }
  }

  return true;
}

// Format time in seconds to mm:ss
export function formatRestTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Format exercise config summary (e.g., "14 @ 4.5 / 12 @ 3.5 / 10 @ 5")
export function formatExerciseSummary(exercise: WorkoutItemExerciseFormData): string {
  if (exercise.sets.length === 0) return "";

  const formatSet = (set: WorkoutSetFormData): string => {
    if (set.targetWeight !== null && set.targetWeight > 0) {
      return `${set.targetReps} @ ${set.targetWeight}`;
    }
    return `${set.targetReps}`;
  };

  return exercise.sets.map(formatSet).join(" / ");
}
