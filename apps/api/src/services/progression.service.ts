import { prisma } from "../lib/prisma";
import {
  SuggestionType,
  SuggestionStatus,
  ProgressionSuggestion,
} from "../generated/prisma/client.js";

// Major muscle groups that indicate compound exercises
const COMPOUND_MUSCLE_GROUPS = [
  "pectoraux",
  "dos",
  "quadriceps",
  "ischios",
  "fessiers",
];

// Weight increments based on exercise type
const WEIGHT_INCREMENT_COMPOUND = 5; // kg
const WEIGHT_INCREMENT_ISOLATION = 2.5; // kg
const REP_INCREMENT = 2;

// Number of sessions to check for cooldown
const COOLDOWN_SESSIONS = 3;

// Minimum number of PAST sessions where targets were met to suggest progression
// Note: Current session is checked separately, so total = MIN_SUCCESSFUL_SESSIONS + 1
// With value 2, we need: current session (1) + 2 past sessions = 3 total
const MIN_SUCCESSFUL_SESSIONS = 2;

export interface ProgressionAnalysis {
  shouldSuggest: boolean;
  suggestionType: SuggestionType | null;
  currentValue: number;
  suggestedValue: number;
  reason: string;
}

interface SessionSetData {
  targetReps: number;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
}

/**
 * Determines if an exercise is a compound movement based on muscle groups
 */
function isCompoundExercise(muscleGroups: string[]): boolean {
  return muscleGroups.some((g) =>
    COMPOUND_MUSCLE_GROUPS.includes(g.toLowerCase())
  );
}

/**
 * Get the weight increment based on exercise type
 */
function getWeightIncrement(muscleGroups: string[]): number {
  return isCompoundExercise(muscleGroups)
    ? WEIGHT_INCREMENT_COMPOUND
    : WEIGHT_INCREMENT_ISOLATION;
}

/**
 * Check if there's a recently dismissed suggestion for this exercise
 */
async function checkRecentDismissed(
  userId: string,
  exerciseId: string,
  sessionCount: number
): Promise<boolean> {
  // Get the last N completed sessions for this user
  const recentSessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    take: sessionCount,
    select: { id: true },
  });

  if (recentSessions.length === 0) return false;

  const sessionIds = recentSessions.map((s) => s.id);

  // Check if any of these sessions have a dismissed suggestion for this exercise
  const dismissedSuggestion = await prisma.progressionSuggestion.findFirst({
    where: {
      userId,
      exerciseId,
      sessionId: { in: sessionIds },
      status: "dismissed",
    },
  });

  return dismissedSuggestion !== null;
}

/**
 * Count how many past sessions had all sets meeting their targets for this exercise.
 * Each set is evaluated independently against its own target (not an average).
 *
 * For exercises with varying targets per set (e.g., 15@15, 12@20, 12@20, 15@15),
 * we check that each set met its specific target, and that the session had
 * the same set structure as the current one.
 */
async function countSuccessfulSessions(
  userId: string,
  exerciseId: string,
  maxSessions: number,
  currentSets: Array<{ setNumber: number; targetReps: number; targetWeight: number | null }>
): Promise<number> {
  // Get completed sessions with this exercise
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    take: maxSessions,
    include: {
      exercises: {
        where: { exerciseId },
        include: {
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });

  let successfulCount = 0;

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      // Only count sessions with completed sets
      const completedSets = exercise.sets.filter((s) => s.actualReps !== null);
      if (completedSets.length === 0) continue;

      // Check that the session has the same number of sets
      if (completedSets.length !== currentSets.length) continue;

      // Check each set individually against current targets
      // Session must have same or higher targets for each set
      let allSetsMatch = true;
      let allSetsMet = true;

      for (const currentSet of currentSets) {
        const sessionSet = completedSets.find((s) => s.setNumber === currentSet.setNumber);
        if (!sessionSet) {
          allSetsMatch = false;
          break;
        }

        // Check if target level is same or higher
        const sameRepsTarget = sessionSet.targetReps >= currentSet.targetReps;
        const sameWeightTarget =
          currentSet.targetWeight === null ||
          currentSet.targetWeight === 0 ||
          sessionSet.targetWeight === null ||
          sessionSet.targetWeight >= currentSet.targetWeight;

        if (!sameRepsTarget || !sameWeightTarget) {
          allSetsMatch = false;
          break;
        }

        // Check if actual met target
        const repsOk = (sessionSet.actualReps as number) >= sessionSet.targetReps;
        const weightOk =
          sessionSet.targetWeight === null ||
          sessionSet.actualWeight === null ||
          sessionSet.actualWeight >= sessionSet.targetWeight;

        if (!repsOk || !weightOk) {
          allSetsMet = false;
        }
      }

      if (allSetsMatch && allSetsMet) {
        successfulCount++;
      }
    }
  }

  return successfulCount;
}

/**
 * Evaluate a single exercise for progression suggestion
 */
export async function evaluateExercise(
  userId: string,
  exerciseId: string,
  currentSessionSets: SessionSetData[],
  muscleGroups: string[]
): Promise<ProgressionAnalysis> {
  const noSuggestion: ProgressionAnalysis = {
    shouldSuggest: false,
    suggestionType: null,
    currentValue: 0,
    suggestedValue: 0,
    reason: "",
  };

  // Filter only completed sets
  const completedSets = currentSessionSets.filter((s) => s.actualReps !== null);

  if (completedSets.length === 0) {
    return noSuggestion;
  }

  // Check if this is a bodyweight exercise (no weight targets)
  const hasWeightTargets = completedSets.some(
    (s) => s.targetWeight !== null && s.targetWeight > 0
  );

  // RG1: Check if ALL sets in current session met their targets
  const allSetsMetTarget = completedSets.every((s) => {
    const repsOk = (s.actualReps as number) >= s.targetReps;
    const weightOk =
      s.targetWeight === null ||
      s.actualWeight === null ||
      s.actualWeight >= s.targetWeight;
    return repsOk && weightOk;
  });

  if (!allSetsMetTarget) {
    return noSuggestion;
  }

  // RG2: Check cooldown (no recently dismissed suggestion)
  const recentlyDismissed = await checkRecentDismissed(
    userId,
    exerciseId,
    COOLDOWN_SESSIONS
  );

  if (recentlyDismissed) {
    return noSuggestion;
  }

  // RG3: Check stability - count past sessions where each set met its target
  // Build current sets structure for comparison
  const currentSets = completedSets.map((s, idx) => ({
    setNumber: idx + 1, // Use index+1 if setNumber not available
    targetReps: s.targetReps,
    targetWeight: s.targetWeight,
  }));

  const successfulSessions = await countSuccessfulSessions(
    userId,
    exerciseId,
    MIN_SUCCESSFUL_SESSIONS + 2, // Check a few extra to account for gaps
    currentSets
  );

  // Need at least MIN_SUCCESSFUL_SESSIONS (3) past sessions with targets met
  if (successfulSessions < MIN_SUCCESSFUL_SESSIONS) {
    return noSuggestion;
  }

  // RG4/RG5: Determine suggestion type based on exercise type
  const isBodyweight = !hasWeightTargets;

  if (isBodyweight) {
    // Bodyweight exercise: suggest rep increase
    // Store the increment value (not absolute) for per-set application
    return {
      shouldSuggest: true,
      suggestionType: SuggestionType.increase_reps,
      currentValue: 0, // Base value for increment calculation
      suggestedValue: REP_INCREMENT,
      reason: `Objectifs atteints sur ${successfulSessions} séances. +${REP_INCREMENT} reps par série !`,
    };
  } else {
    // Weighted exercise: suggest weight increase
    const weightIncrement = getWeightIncrement(muscleGroups);
    // Store the increment value (not absolute) for per-set application
    return {
      shouldSuggest: true,
      suggestionType: SuggestionType.increase_weight,
      currentValue: 0, // Base value for increment calculation
      suggestedValue: weightIncrement,
      reason: `Objectifs atteints sur ${successfulSessions} séances. +${weightIncrement}kg par série !`,
    };
  }
}

/**
 * Evaluate all exercises in a session and create suggestions
 * Works for both in_progress (on summary screen) and completed sessions
 */
export async function evaluateSession(
  sessionId: string
): Promise<ProgressionSuggestion[]> {
  // Get the session with all exercise data
  // Note: We don't filter on exercise status because it may stay "pending" even when sets are done
  // Instead, we check if sets have actualReps (meaning they were completed)
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      exercises: {
        where: {
          // Exclude skipped and substituted exercises
          status: { notIn: ["skipped", "substituted"] },
        },
        include: {
          exercise: true,
          sets: true,
        },
      },
    },
  });

  // Allow in_progress (summary screen) and completed sessions
  if (!session || session.status === "abandoned") {
    return [];
  }

  const suggestions: ProgressionSuggestion[] = [];

  for (const sessionExercise of session.exercises) {
    const exerciseId = sessionExercise.exerciseId;
    const muscleGroups = sessionExercise.exercise.muscleGroups;

    const setsData: SessionSetData[] = sessionExercise.sets.map((set) => ({
      targetReps: set.targetReps,
      targetWeight: set.targetWeight,
      actualReps: set.actualReps,
      actualWeight: set.actualWeight,
    }));

    const analysis = await evaluateExercise(
      session.userId,
      exerciseId,
      setsData,
      muscleGroups
    );

    if (analysis.shouldSuggest && analysis.suggestionType) {
      // Try to create, handle race condition by fetching existing if duplicate
      try {
        const suggestion = await prisma.progressionSuggestion.create({
          data: {
            userId: session.userId,
            exerciseId,
            sessionId,
            suggestionType: analysis.suggestionType,
            currentValue: analysis.currentValue,
            suggestedValue: analysis.suggestedValue,
            reason: analysis.reason,
            status: SuggestionStatus.pending,
          },
        });
        suggestions.push(suggestion);
      } catch (error) {
        // If unique constraint error (P2002), fetch existing suggestion
        if (
          error instanceof Error &&
          "code" in error &&
          (error as { code: string }).code === "P2002"
        ) {
          const existing = await prisma.progressionSuggestion.findUnique({
            where: {
              sessionId_exerciseId: { sessionId, exerciseId },
            },
          });
          if (existing) {
            suggestions.push(existing);
          }
        } else {
          throw error;
        }
      }
    }
  }

  return suggestions;
}

/**
 * Get all suggestions for a session
 */
export async function getSessionSuggestions(
  sessionId: string
): Promise<
  (ProgressionSuggestion & { exercise: { name: string; muscleGroups: string[] } })[]
> {
  return prisma.progressionSuggestion.findMany({
    where: { sessionId },
    include: {
      exercise: {
        select: {
          name: true,
          muscleGroups: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Accept or dismiss a suggestion
 */
export async function respondToSuggestion(
  suggestionId: string,
  status: "accepted" | "dismissed"
): Promise<ProgressionSuggestion> {
  const suggestion = await prisma.progressionSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      session: {
        include: {
          exercises: {
            include: {
              workoutItemExercise: {
                include: {
                  sets: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  // If accepted, update the workout template
  if (status === "accepted") {
    // Find the corresponding workout sets to update
    const sessionExercise = suggestion.session.exercises.find(
      (e) => e.exerciseId === suggestion.exerciseId
    );

    if (sessionExercise?.workoutItemExercise) {
      const workoutItemExerciseId = sessionExercise.workoutItemExercise.id;

      // Calculate the increment (difference between suggested and current)
      const increment = suggestion.suggestedValue - suggestion.currentValue;

      // Update all workout sets for this exercise in the template
      // Use increment to preserve each set's individual value
      if (suggestion.suggestionType === SuggestionType.increase_weight) {
        await prisma.workoutSet.updateMany({
          where: { workoutItemExerciseId },
          data: { targetWeight: { increment } },
        });
      } else if (suggestion.suggestionType === SuggestionType.increase_reps) {
        await prisma.workoutSet.updateMany({
          where: { workoutItemExerciseId },
          data: { targetReps: { increment: Math.round(increment) } },
        });
      }
    }
  }

  // Update the suggestion status
  return prisma.progressionSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: status === "accepted" ? SuggestionStatus.accepted : SuggestionStatus.dismissed,
      respondedAt: new Date(),
    },
  });
}
