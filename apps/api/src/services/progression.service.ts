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

// Minimum number of sessions where targets were met to suggest progression
const MIN_SUCCESSFUL_SESSIONS = 3;

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
 * Count how many past sessions had all sets meeting their targets for this exercise
 * at the CURRENT target level.
 *
 * This is the key stability check: did the user consistently hit THIS specific target?
 * Sessions with lower targets don't count - we need stability at the current level.
 */
async function countSuccessfulSessions(
  userId: string,
  exerciseId: string,
  maxSessions: number,
  currentTargetReps: number,
  currentTargetWeight: number | null
): Promise<number> {
  // Get completed sessions with this exercise
  // Note: We don't filter on exercise status because it may stay "pending" even when sets are done
  // Instead, we check if sets have actualReps (meaning they were completed)
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    take: maxSessions,
    include: {
      exercises: {
        where: {
          exerciseId,
          // Don't filter on status - check actualReps on sets instead
        },
        include: {
          sets: true,
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

      // Check if this session was at the SAME target level as current
      // Sessions with lower targets don't count toward stability
      const sameTargetLevel = completedSets.every((set) => {
        const sameReps = set.targetReps >= currentTargetReps;
        const sameWeight =
          currentTargetWeight === null ||
          currentTargetWeight === 0 ||
          set.targetWeight === null ||
          set.targetWeight >= currentTargetWeight;
        return sameReps && sameWeight;
      });

      if (!sameTargetLevel) continue;

      // Check if ALL sets met their targets
      const allSetsMet = completedSets.every((set) => {
        const repsOk = (set.actualReps as number) >= set.targetReps;
        const weightOk =
          set.targetWeight === null ||
          set.actualWeight === null ||
          set.actualWeight >= set.targetWeight;
        return repsOk && weightOk;
      });

      if (allSetsMet) {
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

  // Calculate averages for current session
  const avgTargetReps = Math.round(
    completedSets.reduce((sum, s) => sum + s.targetReps, 0) / completedSets.length
  );
  const weightsWithTarget = completedSets.filter((s) => s.targetWeight !== null);
  const avgTargetWeight =
    weightsWithTarget.length > 0
      ? weightsWithTarget.reduce((sum, s) => sum + (s.targetWeight as number), 0) /
        weightsWithTarget.length
      : 0;

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

  // RG3: Check stability - count past sessions where targets were met at CURRENT level
  // We check more sessions to find at least MIN_SUCCESSFUL_SESSIONS successful ones
  // Pass current targets so we only count sessions at the same difficulty level
  const successfulSessions = await countSuccessfulSessions(
    userId,
    exerciseId,
    MIN_SUCCESSFUL_SESSIONS + 2, // Check a few extra to account for gaps
    avgTargetReps,
    avgTargetWeight > 0 ? avgTargetWeight : null
  );

  // Need at least MIN_SUCCESSFUL_SESSIONS (3) past sessions with targets met
  if (successfulSessions < MIN_SUCCESSFUL_SESSIONS) {
    return noSuggestion;
  }

  // RG4/RG5: Determine suggestion type based on exercise type
  const isBodyweight = avgTargetWeight === 0;

  if (isBodyweight) {
    // Bodyweight exercise: suggest rep increase
    const newReps = avgTargetReps + REP_INCREMENT;
    return {
      shouldSuggest: true,
      suggestionType: SuggestionType.increase_reps,
      currentValue: avgTargetReps,
      suggestedValue: newReps,
      reason: `Objectifs atteints sur ${successfulSessions} séances. Passez à ${newReps} reps !`,
    };
  } else {
    // Weighted exercise: suggest weight increase
    const weightIncrement = getWeightIncrement(muscleGroups);
    const newWeight = avgTargetWeight + weightIncrement;
    return {
      shouldSuggest: true,
      suggestionType: SuggestionType.increase_weight,
      currentValue: avgTargetWeight,
      suggestedValue: newWeight,
      reason: `Objectifs atteints sur ${successfulSessions} séances. Prêt pour ${newWeight}kg ?`,
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
      // Check if a suggestion already exists for this session/exercise
      const existingSuggestion = await prisma.progressionSuggestion.findUnique({
        where: {
          sessionId_exerciseId: {
            sessionId,
            exerciseId,
          },
        },
      });

      if (!existingSuggestion) {
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
      } else {
        suggestions.push(existingSuggestion);
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

      // Update all workout sets for this exercise in the template
      if (suggestion.suggestionType === SuggestionType.increase_weight) {
        await prisma.workoutSet.updateMany({
          where: { workoutItemExerciseId },
          data: { targetWeight: suggestion.suggestedValue },
        });
      } else if (suggestion.suggestionType === SuggestionType.increase_reps) {
        await prisma.workoutSet.updateMany({
          where: { workoutItemExerciseId },
          data: { targetReps: Math.round(suggestion.suggestedValue) },
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
