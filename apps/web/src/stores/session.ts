import { create } from "zustand";
import {
  WorkoutSession,
  SessionExercise,
  SessionSet,
  startSession as apiStartSession,
  getSession as apiGetSession,
  getActiveSession as apiGetActiveSession,
  updateSession as apiUpdateSession,
  recordSetResult as apiRecordSetResult,
  skipExercise as apiSkipExercise,
  substituteExercise as apiSubstituteExercise,
  reorderExercises as apiReorderExercises,
  SessionError,
} from "@/lib/api/sessions";
import {
  getExerciseLastPerformance as apiGetExerciseLastPerformance,
  ExerciseLastPerformance,
} from "@/lib/api/exercises";

// localStorage helpers for rest state persistence
const REST_STATE_KEY = "momentum_rest_state";

interface PersistedRestState {
  sessionId: string;
  restEndAt: number;
  restDuration: number;
  currentScreen: SessionScreen;
  currentExerciseIndex: number;
  currentSetIndex: number;
  isInSuperset: boolean;
  supersetRound: number;
  supersetExerciseIndex: number;
  supersetExerciseIds: string[];
}

function saveRestState(state: PersistedRestState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REST_STATE_KEY, JSON.stringify(state));
}

function loadRestState(sessionId: string): PersistedRestState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(REST_STATE_KEY);
    if (!stored) return null;
    const state = JSON.parse(stored) as PersistedRestState;
    // Only return if it's for the same session and rest hasn't expired
    if (state.sessionId === sessionId && state.restEndAt > Date.now()) {
      return state;
    }
    // Clean up expired/wrong session state
    clearRestState();
    return null;
  } catch {
    return null;
  }
}

function clearRestState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REST_STATE_KEY);
}

export type SessionScreen =
  | "overview" // Session overview before starting
  | "exercise" // Active exercise (read-only)
  | "rest" // Rest timer + result input
  | "transition" // Between exercises (with options bar)
  | "superset-exercise" // Active exercise in superset
  | "superset-rest" // Rest between superset rounds
  | "superset-transition" // End of superset
  | "summary"; // Session complete

interface PendingResult {
  reps: number;
  weight: number;
}

interface SessionState {
  // Core state
  session: WorkoutSession | null;
  lastSession: WorkoutSession | null;
  isLoading: boolean;
  error: string | null;

  // Navigation state
  currentExerciseIndex: number;
  currentSetIndex: number;
  currentScreen: SessionScreen;

  // Timer state
  isResting: boolean;
  isPaused: boolean;
  restDuration: number;
  restEndAt: number | null;
  restTimeRemaining: number;

  // Superset state
  isInSuperset: boolean;
  supersetRound: number;
  supersetExerciseIndex: number;
  supersetExerciseIds: string[];

  // Pending results (before saving to API)
  pendingResults: Map<string, PendingResult>;

  // Cache for last performance data (keyed by exerciseId)
  lastPerformanceCache: Map<string, ExerciseLastPerformance>;

  // Actions
  fetchLastPerformance: (token: string, exerciseId: string) => Promise<ExerciseLastPerformance | null>;
  initSession: (token: string, workoutId: string) => Promise<void>;
  loadSession: (token: string, sessionId: string) => Promise<void>;
  loadActiveSession: (token: string) => Promise<WorkoutSession | null>;
  startFromOverview: () => void;
  skipFirstExercise: (token: string) => Promise<void>;
  substituteFirstExercise: (token: string, newExerciseId: string) => Promise<void>;
  completeSet: (token: string, result: PendingResult) => Promise<void>;
  skipRest: () => void;
  adjustRestTime: (delta: number) => void;
  skipExercise: (token: string) => Promise<void>;
  postponeExercise: (token: string, exerciseIds: string[]) => Promise<void>;
  substituteExercise: (token: string, newExerciseId: string) => Promise<void>;
  abandonSession: (token: string) => Promise<void>;
  completeSession: (token: string, notes?: string) => Promise<void>;
  updatePendingResult: (exerciseId: string, result: PendingResult) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tick: () => void;
  reset: () => void;

  // Helpers
  isExerciseInSuperset: (exercise: SessionExercise | null | undefined, allActiveExercises: SessionExercise[]) => boolean;
  getSupersetExerciseIds: (exercise: SessionExercise | null | undefined, allActiveExercises: SessionExercise[]) => string[];
  getCurrentExercise: () => SessionExercise | null;
  getNextExercise: () => SessionExercise | null;
  getCurrentSet: () => SessionSet | null;
  getNextSet: () => SessionSet | null;
  getLastSessionSet: (exerciseId: string, setNumber: number) => SessionSet | null;
  getActiveExercises: () => SessionExercise[];
  isLastSet: () => boolean;
  isLastExercise: () => boolean;
}

const initialState = {
  session: null,
  lastSession: null,
  isLoading: false,
  error: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  currentScreen: "overview" as SessionScreen,
  isResting: false,
  isPaused: false,
  restDuration: 0,
  restEndAt: null as number | null,
  restTimeRemaining: 0,
  isInSuperset: false,
  supersetRound: 0,
  supersetExerciseIndex: 0,
  supersetExerciseIds: [],
  pendingResults: new Map<string, PendingResult>(),
  lastPerformanceCache: new Map<string, ExerciseLastPerformance>(),
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  fetchLastPerformance: async (token: string, exerciseId: string) => {
    // Check cache first (using fresh state)
    const cached = get().lastPerformanceCache.get(exerciseId);
    if (cached) return cached;

    try {
      const response = await apiGetExerciseLastPerformance(token, exerciseId);
      const data = response.data;
      if (data) {
        // Update cache using updater function to avoid race conditions
        // when multiple fetchLastPerformance calls run in parallel
        set((currentState) => {
          const newCache = new Map(currentState.lastPerformanceCache);
          newCache.set(exerciseId, data);
          return { lastPerformanceCache: newCache };
        });
        return data;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch last performance:", error);
      return null;
    }
  },

  initSession: async (token: string, workoutId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiStartSession(token, workoutId);
      const activeExercises = response.data.exercises.filter(
        (e) => e.status !== "substituted" && e.status !== "skipped"
      );

      // Determine if first exercise is a superset (by counting exercises with same workoutItemId)
      const firstExercise = activeExercises[0];
      const workoutItemId = firstExercise?.workoutItem?.id;
      const supersetCount = workoutItemId
        ? activeExercises.filter((e) => e.workoutItem?.id === workoutItemId).length
        : 0;
      const isSuperset = supersetCount > 1;
      const supersetIds = isSuperset
        ? activeExercises
            .filter((e) => e.workoutItem?.id === workoutItemId)
            .map((e) => e.id)
        : [];

      set({
        session: response.data,
        lastSession: response.lastSession,
        isLoading: false,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        currentScreen: "overview",
        isInSuperset: isSuperset,
        supersetRound: isSuperset ? 1 : 0,
        supersetExerciseIndex: 0,
        supersetExerciseIds: supersetIds,
        pendingResults: new Map(),
      });
    } catch (error) {
      const message = error instanceof SessionError ? error.message : "Failed to start session";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  loadSession: async (token: string, sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetSession(token, sessionId);
      const session = response.data;

      // Calculate navigation state from completed sets
      const activeExercises = session.exercises.filter(
        (e) => e.status !== "substituted" && e.status !== "skipped"
      );

      // First, detect if the first exercise is part of a superset
      const firstExercise = activeExercises[0];
      const firstWorkoutItemId = firstExercise?.workoutItem?.id;
      const firstSupersetExercises = firstWorkoutItemId
        ? activeExercises.filter((e) => e.workoutItem?.id === firstWorkoutItemId)
        : [];
      const isFirstSuperset = firstSupersetExercises.length > 1;

      // Find current position - need to handle supersets specially
      let currentExerciseIndex = 0;
      let currentSetIndex = 0;
      let foundIncomplete = false;
      let isSuperset = false;
      let supersetExerciseIds: string[] = [];
      let supersetExerciseIndex = 0;
      let supersetRound = 1;

      if (isFirstSuperset) {
        // For supersets, we need to find position based on round structure
        // Round N means: all exercises do set N before moving to set N+1
        const supersetIds = firstSupersetExercises.map((e) => e.id);
        const maxSets = Math.max(...firstSupersetExercises.map((e) => e.sets.length));

        // Find the current round and exercise within round
        outerLoop: for (let round = 0; round < maxSets; round++) {
          for (let exIdx = 0; exIdx < supersetIds.length; exIdx++) {
            const exId = supersetIds[exIdx];
            const exercise = activeExercises.find((e) => e.id === exId);
            if (!exercise) continue;
            const setData = exercise.sets[round];
            if (setData && !setData.completedAt) {
              // Found first incomplete set in superset order
              currentExerciseIndex = activeExercises.findIndex((e) => e.id === exId);
              currentSetIndex = round;
              supersetRound = round + 1;
              supersetExerciseIndex = exIdx;
              foundIncomplete = true;
              break outerLoop;
            }
          }
        }

        if (foundIncomplete) {
          isSuperset = true;
          supersetExerciseIds = supersetIds;
        } else {
          // All superset sets completed, check for exercises after superset
          const nextNonSupersetIdx = activeExercises.findIndex(
            (e) => !supersetIds.includes(e.id)
          );
          if (nextNonSupersetIdx !== -1) {
            // Move to next exercise after superset
            currentExerciseIndex = nextNonSupersetIdx;
            currentSetIndex = 0;
            // Check if this next exercise is also a superset
            const nextEx = activeExercises[nextNonSupersetIdx];
            const nextWorkoutItemId = nextEx?.workoutItem?.id;
            const nextSupersetCount = nextWorkoutItemId
              ? activeExercises.filter((e) => e.workoutItem?.id === nextWorkoutItemId).length
              : 0;
            isSuperset = nextSupersetCount > 1;
            if (isSuperset) {
              supersetExerciseIds = activeExercises
                .filter((e) => e.workoutItem?.id === nextWorkoutItemId)
                .map((e) => e.id);
              supersetExerciseIndex = 0;
              supersetRound = 1;
            }
            foundIncomplete = true;
          }
        }
      }

      // If not a superset or superset fully completed, use linear search
      if (!foundIncomplete) {
        for (let exIdx = 0; exIdx < activeExercises.length; exIdx++) {
          const exercise = activeExercises[exIdx];
          if (!exercise) continue;

          // Check if this exercise is part of a superset
          const workoutItemId = exercise.workoutItem?.id;
          const exercisesInItem = workoutItemId
            ? activeExercises.filter((e) => e.workoutItem?.id === workoutItemId)
            : [exercise];

          if (exercisesInItem.length > 1) {
            // This is a superset - use round-based search
            const supersetIds = exercisesInItem.map((e) => e.id);
            const maxSets = Math.max(...exercisesInItem.map((e) => e.sets.length));

            for (let round = 0; round < maxSets; round++) {
              for (const exId of supersetIds) {
                const ex = activeExercises.find((e) => e.id === exId);
                if (!ex) continue;
                const setData = ex.sets[round];
                if (setData && !setData.completedAt) {
                  currentExerciseIndex = activeExercises.findIndex((e) => e.id === exId);
                  currentSetIndex = round;
                  supersetRound = round + 1;
                  supersetExerciseIndex = supersetIds.indexOf(exId);
                  supersetExerciseIds = supersetIds;
                  isSuperset = true;
                  foundIncomplete = true;
                  break;
                }
              }
              if (foundIncomplete) break;
            }
            if (foundIncomplete) break;
            // Skip past all exercises in this superset
            exIdx = activeExercises.findIndex(
              (e) => e.id === supersetIds[supersetIds.length - 1]
            );
          } else {
            // Single exercise - linear search
            for (let setIdx = 0; setIdx < exercise.sets.length; setIdx++) {
              const setData = exercise.sets[setIdx];
              if (setData && !setData.completedAt) {
                currentExerciseIndex = exIdx;
                currentSetIndex = setIdx;
                foundIncomplete = true;
                break;
              }
            }
            if (foundIncomplete) break;
          }
        }
      }

      // If all sets completed, go to summary
      if (!foundIncomplete && activeExercises.length > 0) {
        currentExerciseIndex = activeExercises.length - 1;
        const lastExercise = activeExercises[currentExerciseIndex];
        currentSetIndex = lastExercise ? lastExercise.sets.length - 1 : 0;
      }

      // Check for persisted rest state
      const persistedRest = loadRestState(sessionId);

      if (persistedRest) {
        // Restore from persisted rest state
        const remaining = Math.max(0, Math.ceil((persistedRest.restEndAt - Date.now()) / 1000));
        set({
          session,
          lastSession: response.lastSession,
          isLoading: false,
          currentExerciseIndex: persistedRest.currentExerciseIndex,
          currentSetIndex: persistedRest.currentSetIndex,
          currentScreen: persistedRest.currentScreen,
          isInSuperset: persistedRest.isInSuperset,
          supersetRound: persistedRest.supersetRound,
          supersetExerciseIndex: persistedRest.supersetExerciseIndex,
          supersetExerciseIds: persistedRest.supersetExerciseIds,
          isResting: true,
          restEndAt: persistedRest.restEndAt,
          restDuration: persistedRest.restDuration,
          restTimeRemaining: remaining,
          pendingResults: new Map(),
        });
      } else {
        // Determine screen based on session progress
        const allSetsCompleted = activeExercises.every((ex) =>
          ex.sets.every((s) => s.completedAt)
        );

        // Check if this is a fresh session (no sets completed at all)
        const noSetsCompleted = activeExercises.every((ex) =>
          ex.sets.every((s) => !s.completedAt)
        );

        let currentScreen: SessionScreen;
        if (allSetsCompleted) {
          currentScreen = "summary";
        } else if (noSetsCompleted) {
          // Fresh session - show overview
          currentScreen = "overview";
        } else {
          // In progress - show exercise
          currentScreen = isSuperset ? "superset-exercise" : "exercise";
        }

        set({
          session,
          lastSession: response.lastSession,
          isLoading: false,
          currentExerciseIndex,
          currentSetIndex,
          currentScreen,
          isInSuperset: isSuperset,
          supersetRound,
          supersetExerciseIndex,
          supersetExerciseIds,
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
          restDuration: 0,
          pendingResults: new Map(),
        });
      }
    } catch (error) {
      const message = error instanceof SessionError ? error.message : "Failed to load session";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  loadActiveSession: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetActiveSession(token);
      if (response.data) {
        set({
          session: response.data,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      return null;
    }
  },

  startFromOverview: () => {
    const state = get();
    if (state.currentScreen !== "overview") return;

    const activeExercises = state.getActiveExercises();
    const firstExercise = activeExercises[0];
    // Detect superset by counting exercises with same workoutItemId
    const isSuperset = state.isExerciseInSuperset(firstExercise, activeExercises);
    const supersetIds = isSuperset
      ? state.getSupersetExerciseIds(firstExercise, activeExercises)
      : [];

    set({
      currentScreen: isSuperset ? "superset-exercise" : "exercise",
      isInSuperset: isSuperset,
      supersetRound: isSuperset ? 1 : 0,
      supersetExerciseIndex: 0,
      supersetExerciseIds: supersetIds,
    });
  },

  skipFirstExercise: async (token: string) => {
    const state = get();
    if (state.currentScreen !== "overview" || !state.session) return;

    const activeExercises = state.getActiveExercises();
    const firstExercise = activeExercises[0];
    if (!firstExercise) return;

    try {
      // Check if first exercise is part of a superset
      const isFirstInSuperset = state.isExerciseInSuperset(firstExercise, activeExercises);
      const exercisesToSkip = isFirstInSuperset
        ? state.getSupersetExerciseIds(firstExercise, activeExercises)
        : [firstExercise.id];

      // Skip all exercises (API calls in parallel)
      await Promise.all(
        exercisesToSkip.map((exId) => apiSkipExercise(token, state.session!.id, exId))
      );

      // Update local state - mark all skipped exercises
      const skippedSet = new Set(exercisesToSkip);
      const updatedExercises = state.session.exercises.map((ex) =>
        skippedSet.has(ex.id) ? { ...ex, status: "skipped" as const } : ex
      );

      const updatedSession = { ...state.session, exercises: updatedExercises };

      // Check if there are remaining exercises
      const remainingExercises = updatedSession.exercises.filter(
        (e) => e.status !== "substituted" && e.status !== "skipped"
      );

      if (remainingExercises.length === 0) {
        // No more exercises, go to summary
        set({ session: updatedSession, currentScreen: "summary" });
      } else {
        // Update superset state if next exercise is a superset (by counting exercises with same workoutItemId)
        const nextExercise = remainingExercises[0];
        const nextWorkoutItemId = nextExercise?.workoutItem?.id;
        const supersetCount = nextWorkoutItemId
          ? remainingExercises.filter((e) => e.workoutItem?.id === nextWorkoutItemId).length
          : 0;
        const isSuperset = supersetCount > 1;
        const supersetIds = isSuperset
          ? remainingExercises
              .filter((e) => e.workoutItem?.id === nextWorkoutItemId)
              .map((e) => e.id)
          : [];

        set({
          session: updatedSession,
          isInSuperset: isSuperset,
          supersetRound: isSuperset ? 1 : 0,
          supersetExerciseIndex: 0,
          supersetExerciseIds: supersetIds,
        });
      }
    } catch (error) {
      console.error("Failed to skip first exercise:", error);
    }
  },

  substituteFirstExercise: async (token: string, newExerciseId: string) => {
    const state = get();
    if (state.currentScreen !== "overview" || !state.session) return;

    const activeExercises = state.getActiveExercises();
    const firstExercise = activeExercises[0];
    if (!firstExercise) return;

    try {
      await apiSubstituteExercise(token, state.session.id, firstExercise.id, newExerciseId);

      // Reload session to get updated exercises
      await state.loadSession(token, state.session.id);

      // Stay on overview screen after reload
      set({ currentScreen: "overview" });
    } catch (error) {
      console.error("Failed to substitute first exercise:", error);
    }
  },

  completeSet: async (token: string, result: PendingResult) => {
    const state = get();
    const exercise = state.getCurrentExercise();
    const currentSet = state.getCurrentSet();

    if (!state.session || !exercise || !currentSet) return;

    try {
      // Record result to API
      await apiRecordSetResult(token, state.session.id, exercise.id, {
        setNumber: currentSet.setNumber,
        actualReps: result.reps,
        actualWeight: result.weight,
      });

      // Update local state with result
      const updatedExercises = state.session.exercises.map((ex) => {
        if (ex.id === exercise.id) {
          return {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === currentSet.id
                ? { ...s, actualReps: result.reps, actualWeight: result.weight, completedAt: new Date().toISOString() }
                : s
            ),
          };
        }
        return ex;
      });

      // Clear pending result for this exercise (so next set uses target values)
      const newPendingResults = new Map(state.pendingResults);
      newPendingResults.delete(exercise.id);

      set({
        session: { ...state.session, exercises: updatedExercises },
        pendingResults: newPendingResults,
      });

      // Determine next state
      const activeExercises = state.getActiveExercises();

      if (state.isInSuperset) {
        // Superset logic
        const currentSupersetIdx = state.supersetExerciseIndex;
        const isLastInSuperset = currentSupersetIdx >= state.supersetExerciseIds.length - 1;
        // For dynamically created supersets, rounds = sets.length; for original supersets, use workoutItem.rounds
        const totalRounds = exercise.sets.length || exercise.workoutItem?.rounds || 1;
        const isLastRound = state.supersetRound >= totalRounds;

        if (isLastInSuperset) {
          if (isLastRound) {
            // End of superset
            const nextNonSupersetIdx = activeExercises.findIndex(
              (e, i) => i > state.currentExerciseIndex && e.workoutItem?.id !== exercise.workoutItem?.id
            );

            if (nextNonSupersetIdx === -1) {
              // Last exercise overall - show rest screen to allow result input
              const restDuration = exercise.workoutItem?.restAfter || 90;
              const restEndAt = Date.now() + restDuration * 1000;
              const newState = {
                currentScreen: "superset-rest" as SessionScreen,
                restDuration,
                restEndAt,
                restTimeRemaining: restDuration,
                isResting: true,
              };
              set(newState);
              saveRestState({
                sessionId: state.session!.id,
                restEndAt,
                restDuration,
                currentScreen: newState.currentScreen,
                currentExerciseIndex: state.currentExerciseIndex,
                currentSetIndex: state.currentSetIndex,
                isInSuperset: state.isInSuperset,
                supersetRound: state.supersetRound,
                supersetExerciseIndex: state.supersetExerciseIndex,
                supersetExerciseIds: state.supersetExerciseIds,
              });
            } else {
              const restDuration = exercise.workoutItem?.restAfter || 120;
              const restEndAt = Date.now() + restDuration * 1000;
              const newState = {
                currentScreen: "superset-transition" as SessionScreen,
                restDuration,
                restEndAt,
                restTimeRemaining: restDuration,
                isResting: true,
              };
              set(newState);
              saveRestState({
                sessionId: state.session!.id,
                restEndAt,
                restDuration,
                currentScreen: newState.currentScreen,
                currentExerciseIndex: state.currentExerciseIndex,
                currentSetIndex: state.currentSetIndex,
                isInSuperset: state.isInSuperset,
                supersetRound: state.supersetRound,
                supersetExerciseIndex: state.supersetExerciseIndex,
                supersetExerciseIds: state.supersetExerciseIds,
              });
            }
          } else {
            // Move to rest between rounds
            const restDuration = exercise.workoutItem?.restAfter || 90;
            const restEndAt = Date.now() + restDuration * 1000;
            const newSupersetRound = state.supersetRound + 1;
            const newSetIndex = state.currentSetIndex + 1;
            const newState = {
              currentScreen: "superset-rest" as SessionScreen,
              supersetRound: newSupersetRound,
              supersetExerciseIndex: 0,
              currentSetIndex: newSetIndex,
              restDuration,
              restEndAt,
              restTimeRemaining: restDuration,
              isResting: true,
            };
            set(newState);
            saveRestState({
              sessionId: state.session!.id,
              restEndAt,
              restDuration,
              currentScreen: newState.currentScreen,
              currentExerciseIndex: state.currentExerciseIndex,
              currentSetIndex: newSetIndex,
              isInSuperset: state.isInSuperset,
              supersetRound: newSupersetRound,
              supersetExerciseIndex: 0,
              supersetExerciseIds: state.supersetExerciseIds,
            });
          }
        } else {
          // Move to next exercise in superset (no timer)
          const nextSupersetExId = state.supersetExerciseIds[currentSupersetIdx + 1];
          const nextIdx = activeExercises.findIndex((e) => e.id === nextSupersetExId);

          set({
            currentExerciseIndex: nextIdx,
            supersetExerciseIndex: currentSupersetIdx + 1,
            currentScreen: "superset-exercise",
          });
        }
      } else {
        // Standard exercise logic
        const totalSets = exercise.sets.length;
        const isLastSet = state.currentSetIndex >= totalSets - 1;

        if (isLastSet) {
          // Check if last exercise
          const isLastExercise = state.currentExerciseIndex >= activeExercises.length - 1;

          if (isLastExercise) {
            // Last set of last exercise - show rest screen to allow result input
            const restDuration = exercise.workoutItemExercise?.restBetweenSets || 90;
            const restEndAt = Date.now() + restDuration * 1000;
            set({
              currentScreen: "rest",
              restDuration,
              restEndAt,
              restTimeRemaining: restDuration,
              isResting: true,
            });
            saveRestState({
              sessionId: state.session!.id,
              restEndAt,
              restDuration,
              currentScreen: "rest",
              currentExerciseIndex: state.currentExerciseIndex,
              currentSetIndex: state.currentSetIndex,
              isInSuperset: false,
              supersetRound: 0,
              supersetExerciseIndex: 0,
              supersetExerciseIds: [],
            });
          } else {
            // Transition to next exercise
            const restDuration = exercise.workoutItem?.restAfter || 120;
            const restEndAt = Date.now() + restDuration * 1000;
            set({
              currentScreen: "transition",
              restDuration,
              restEndAt,
              restTimeRemaining: restDuration,
              isResting: true,
            });
            saveRestState({
              sessionId: state.session!.id,
              restEndAt,
              restDuration,
              currentScreen: "transition",
              currentExerciseIndex: state.currentExerciseIndex,
              currentSetIndex: state.currentSetIndex,
              isInSuperset: false,
              supersetRound: 0,
              supersetExerciseIndex: 0,
              supersetExerciseIds: [],
            });
          }
        } else {
          // Rest before next set
          const restDuration = exercise.workoutItemExercise?.restBetweenSets || 90;
          const restEndAt = Date.now() + restDuration * 1000;
          set({
            currentScreen: "rest",
            restDuration,
            restEndAt,
            restTimeRemaining: restDuration,
            isResting: true,
          });
          saveRestState({
            sessionId: state.session!.id,
            restEndAt,
            restDuration,
            currentScreen: "rest",
            currentExerciseIndex: state.currentExerciseIndex,
            currentSetIndex: state.currentSetIndex,
            isInSuperset: false,
            supersetRound: 0,
            supersetExerciseIndex: 0,
            supersetExerciseIds: [],
          });
        }
      }
    } catch (error) {
      console.error("Failed to record set result:", error);
    }
  },

  skipRest: () => {
    const state = get();
    const activeExercises = state.getActiveExercises();

    // Clear persisted rest state
    clearRestState();

    if (state.currentScreen === "rest") {
      // Check if this is the last set of the last exercise
      const currentExercise = state.getCurrentExercise();
      const totalSets = currentExercise?.sets.length || 0;
      const isLastSet = state.currentSetIndex >= totalSets - 1;
      const isLastExercise = state.currentExerciseIndex >= activeExercises.length - 1;

      if (isLastSet && isLastExercise) {
        // Go to summary
        set({
          currentScreen: "summary",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
        });
      } else {
        // Move to next set
        set({
          currentSetIndex: state.currentSetIndex + 1,
          currentScreen: "exercise",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
        });
      }
    } else if (state.currentScreen === "transition") {
      // Move to next exercise (or summary if all skipped)
      const nextIdx = state.currentExerciseIndex + 1;
      const nextExercise = activeExercises[nextIdx];

      // Check if there's no next exercise (all were skipped)
      if (!nextExercise) {
        set({
          currentScreen: "summary",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
        });
        return;
      }

      // Detect superset by counting exercises with same workoutItemId
      const nextWorkoutItemId = nextExercise.workoutItem?.id;
      const supersetCount = nextWorkoutItemId
        ? activeExercises.filter((e) => e.workoutItem?.id === nextWorkoutItemId).length
        : 0;
      const isSuperset = supersetCount > 1;

      if (isSuperset) {
        const supersetIds = activeExercises
          .filter((e) => e.workoutItem?.id === nextWorkoutItemId)
          .map((e) => e.id);

        set({
          currentExerciseIndex: nextIdx,
          currentSetIndex: 0,
          currentScreen: "superset-exercise",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
          isInSuperset: true,
          supersetRound: 1,
          supersetExerciseIndex: 0,
          supersetExerciseIds: supersetIds,
        });
      } else {
        set({
          currentExerciseIndex: nextIdx,
          currentSetIndex: 0,
          currentScreen: "exercise",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
          isInSuperset: false,
        });
      }
    } else if (state.currentScreen === "superset-rest") {
      // Check if this is the last exercise overall (last round of last superset)
      const currentExercise = state.getCurrentExercise();
      // For dynamically created supersets, rounds = sets.length
      const totalRounds = currentExercise?.sets.length || currentExercise?.workoutItem?.rounds || 1;
      const isLastRound = state.supersetRound >= totalRounds;
      const nextNonSupersetIdx = activeExercises.findIndex(
        (e, i) => i > state.currentExerciseIndex && e.workoutItem?.id !== currentExercise?.workoutItem?.id
      );

      // IMPORTANT: Check if the current round's sets have actually been completed
      // This fixes a bug where supersetRound is pre-incremented when transitioning to rest,
      // causing the session to end prematurely when superset is in last position
      const currentRoundSetIndex = state.currentSetIndex;
      const allSetsInCurrentRoundCompleted = state.supersetExerciseIds.every((exId) => {
        const ex = activeExercises.find((e) => e.id === exId);
        return ex?.sets[currentRoundSetIndex]?.completedAt;
      });

      const isLastExerciseOverall = isLastRound && nextNonSupersetIdx === -1 && allSetsInCurrentRoundCompleted;

      if (isLastExerciseOverall) {
        // Go to summary
        set({
          currentScreen: "summary",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
          isInSuperset: false,
        });
      } else {
        // Move to first exercise of next round
        const firstExId = state.supersetExerciseIds[0];
        const firstIdx = activeExercises.findIndex((e) => e.id === firstExId);

        set({
          currentExerciseIndex: firstIdx,
          supersetExerciseIndex: 0,
          currentScreen: "superset-exercise",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
        });
      }
    } else if (state.currentScreen === "superset-transition") {
      // Move to next non-superset exercise
      const currentEx = state.getCurrentExercise();
      const nextIdx = activeExercises.findIndex(
        (e, i) => i > state.currentExerciseIndex && e.workoutItem?.id !== currentEx?.workoutItem?.id
      );

      if (nextIdx === -1) {
        // No more exercises, go to summary
        set({
          currentScreen: "summary",
          isResting: false,
          restEndAt: null,
          restTimeRemaining: 0,
          isInSuperset: false,
        });
      } else {
        const nextExercise = activeExercises[nextIdx];
        // Detect superset by counting exercises with same workoutItemId
        const nextWorkoutItemId = nextExercise?.workoutItem?.id;
        const supersetCount = nextWorkoutItemId
          ? activeExercises.filter((e) => e.workoutItem?.id === nextWorkoutItemId).length
          : 0;
        const isSuperset = supersetCount > 1;

        if (isSuperset) {
          const supersetIds = activeExercises
            .filter((e) => e.workoutItem?.id === nextWorkoutItemId)
            .map((e) => e.id);

          set({
            currentExerciseIndex: nextIdx,
            currentSetIndex: 0,
            currentScreen: "superset-exercise",
            isResting: false,
            restEndAt: null,
            restTimeRemaining: 0,
            isInSuperset: true,
            supersetRound: 1,
            supersetExerciseIndex: 0,
            supersetExerciseIds: supersetIds,
          });
        } else {
          set({
            currentExerciseIndex: nextIdx,
            currentSetIndex: 0,
            currentScreen: "exercise",
            isResting: false,
            restEndAt: null,
            restTimeRemaining: 0,
            isInSuperset: false,
          });
        }
      }
    }
  },

  adjustRestTime: (delta: number) => {
    const state = get();
    if (!state.isResting || !state.session) return;

    // Calculate new end time based on delta
    const currentEndAt = state.restEndAt || Date.now();
    const newEndAt = Math.max(Date.now(), currentEndAt + delta * 1000);
    const newRemaining = Math.max(0, Math.ceil((newEndAt - Date.now()) / 1000));
    const newDuration = Math.max(state.restDuration, newRemaining);

    set({
      restEndAt: newEndAt,
      restTimeRemaining: newRemaining,
      restDuration: newDuration,
    });

    // Update persisted state
    saveRestState({
      sessionId: state.session.id,
      restEndAt: newEndAt,
      restDuration: newDuration,
      currentScreen: state.currentScreen,
      currentExerciseIndex: state.currentExerciseIndex,
      currentSetIndex: state.currentSetIndex,
      isInSuperset: state.isInSuperset,
      supersetRound: state.supersetRound,
      supersetExerciseIndex: state.supersetExerciseIndex,
      supersetExerciseIds: state.supersetExerciseIds,
    });
  },

  pauseTimer: () => {
    const state = get();
    if (!state.isResting || state.isPaused || !state.restEndAt) return;

    // Calculate current remaining time and freeze it
    const remaining = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
    set({
      isPaused: true,
      restTimeRemaining: remaining,
      restEndAt: null, // Clear end time while paused
    });
  },

  resumeTimer: () => {
    const state = get();
    if (!state.isResting || !state.isPaused) return;

    // Recalculate end time based on frozen remaining time
    const newEndAt = Date.now() + state.restTimeRemaining * 1000;
    set({
      isPaused: false,
      restEndAt: newEndAt,
    });

    // Update persisted state with new end time
    if (state.session) {
      saveRestState({
        sessionId: state.session.id,
        restEndAt: newEndAt,
        restDuration: state.restDuration,
        currentScreen: state.currentScreen,
        currentExerciseIndex: state.currentExerciseIndex,
        currentSetIndex: state.currentSetIndex,
        isInSuperset: state.isInSuperset,
        supersetRound: state.supersetRound,
        supersetExerciseIndex: state.supersetExerciseIndex,
        supersetExerciseIds: state.supersetExerciseIds,
      });
    }
  },

  tick: () => {
    const state = get();
    if (state.isPaused) return; // Don't tick while paused
    if (state.isResting && state.restEndAt) {
      const remaining = Math.max(0, Math.ceil((state.restEndAt - Date.now()) / 1000));
      set({ restTimeRemaining: remaining });

      if (remaining === 0) {
        state.skipRest();
      }
    }
  },

  skipExercise: async (token: string) => {
    const state = get();
    const activeExercises = state.getActiveExercises();
    const nextExercise = state.getNextExercise();

    if (!state.session || !nextExercise) return;

    try {
      // Check if next exercise is part of a superset
      const isNextInSuperset = state.isExerciseInSuperset(nextExercise, activeExercises);
      const exercisesToSkip = isNextInSuperset
        ? state.getSupersetExerciseIds(nextExercise, activeExercises)
        : [nextExercise.id];

      // Skip all exercises (API calls in parallel)
      await Promise.all(
        exercisesToSkip.map((exId) => apiSkipExercise(token, state.session!.id, exId))
      );

      // Update local state - mark all skipped exercises
      const skippedSet = new Set(exercisesToSkip);
      const updatedExercises = state.session.exercises.map((ex) =>
        skippedSet.has(ex.id) ? { ...ex, status: "skipped" as const } : ex
      );

      const updatedSession = { ...state.session, exercises: updatedExercises };
      set({ session: updatedSession });

      // The preview will auto-update because getNextExercise() filters out skipped exercises.
      // If no more exercises, the UI will show the "end of session" message
      // and skipRest will handle going to summary when the timer ends.
    } catch (error) {
      console.error("Failed to skip exercise:", error);
    }
  },

  postponeExercise: async (token: string, exerciseIds: string[]) => {
    const state = get();
    if (!state.session) return;

    // Save timer state before reload
    const timerState = {
      isResting: state.isResting,
      isPaused: state.isPaused,
      restDuration: state.restDuration,
      restEndAt: state.restEndAt,
      restTimeRemaining: state.restTimeRemaining,
      currentScreen: state.currentScreen,
    };

    try {
      await apiReorderExercises(token, state.session.id, exerciseIds);

      // Reload session to get updated order
      await state.loadSession(token, state.session.id);

      // Restore timer state after reload
      set(timerState);
    } catch (error) {
      console.error("Failed to reorder exercises:", error);
    }
  },

  substituteExercise: async (token: string, newExerciseId: string) => {
    const state = get();
    const nextExercise = state.getNextExercise();

    if (!state.session || !nextExercise) return;

    // Save timer state before reload
    const timerState = {
      isResting: state.isResting,
      isPaused: state.isPaused,
      restDuration: state.restDuration,
      restEndAt: state.restEndAt,
      restTimeRemaining: state.restTimeRemaining,
      currentScreen: state.currentScreen,
    };

    try {
      await apiSubstituteExercise(token, state.session.id, nextExercise.id, newExerciseId);

      // Reload session to get updated exercises
      await state.loadSession(token, state.session.id);

      // Restore timer state after reload
      set(timerState);
    } catch (error) {
      console.error("Failed to substitute exercise:", error);
    }
  },

  abandonSession: async (token: string) => {
    const state = get();
    if (!state.session) return;

    try {
      await apiUpdateSession(token, state.session.id, { status: "abandoned" });
      clearRestState();
      state.reset();
    } catch (error) {
      console.error("Failed to abandon session:", error);
    }
  },

  completeSession: async (token: string, notes?: string) => {
    const state = get();
    if (!state.session) return;

    try {
      await apiUpdateSession(token, state.session.id, { status: "completed", notes });
      clearRestState();
      set({
        session: {
          ...state.session,
          status: "completed",
          completedAt: new Date().toISOString(),
          notes: notes || null,
        },
      });
    } catch (error) {
      console.error("Failed to complete session:", error);
    }
  },

  updatePendingResult: (exerciseId: string, result: PendingResult) => {
    const state = get();
    const newPending = new Map(state.pendingResults);
    newPending.set(exerciseId, result);
    set({ pendingResults: newPending });
  },

  reset: () => {
    // Note: Don't clear localStorage here - it's already cleared in abandonSession/completeSession
    // This allows rest state to persist when user navigates away temporarily
    set(initialState);
  },

  // Helper to detect if an exercise is part of a superset by counting exercises with same workoutItemId
  isExerciseInSuperset: (exercise: SessionExercise | null | undefined, allActiveExercises: SessionExercise[]) => {
    if (!exercise?.workoutItem?.id) return false;
    const workoutItemId = exercise.workoutItem.id;
    const count = allActiveExercises.filter((e) => e.workoutItem?.id === workoutItemId).length;
    return count > 1;
  },

  // Get all exercise IDs that share the same workoutItemId (superset members)
  getSupersetExerciseIds: (exercise: SessionExercise | null | undefined, allActiveExercises: SessionExercise[]) => {
    if (!exercise?.workoutItem?.id) return [];
    const workoutItemId = exercise.workoutItem.id;
    return allActiveExercises
      .filter((e) => e.workoutItem?.id === workoutItemId)
      .map((e) => e.id);
  },

  // Helpers
  getCurrentExercise: () => {
    const state = get();
    const activeExercises = state.getActiveExercises();
    return activeExercises[state.currentExerciseIndex] || null;
  },

  getNextExercise: () => {
    const state = get();
    const activeExercises = state.getActiveExercises();

    if (state.isInSuperset) {
      // In superset, next is the next non-superset exercise
      const currentEx = state.getCurrentExercise();
      const nextIdx = activeExercises.findIndex(
        (e, i) => i > state.currentExerciseIndex && e.workoutItem?.id !== currentEx?.workoutItem?.id
      );
      return activeExercises[nextIdx] || null;
    }

    return activeExercises[state.currentExerciseIndex + 1] || null;
  },

  getCurrentSet: () => {
    const exercise = get().getCurrentExercise();
    if (!exercise) return null;
    return exercise.sets[get().currentSetIndex] || null;
  },

  getNextSet: () => {
    const exercise = get().getCurrentExercise();
    const state = get();
    if (!exercise) return null;
    return exercise.sets[state.currentSetIndex + 1] || null;
  },

  getLastSessionSet: (exerciseId: string, setNumber: number) => {
    const state = get();

    // Find matching exercise in current session
    const currentExercise = state.session?.exercises.find((e) => e.id === exerciseId);
    if (!currentExercise) return null;

    // Get the exercise ID (from Exercise table) - try exerciseId first, fallback to exercise.id
    const exerciseTableId = currentExercise.exerciseId || currentExercise.exercise?.id;
    if (!exerciseTableId) return null;

    // First, check the lastPerformanceCache (for any exercise, across all workouts)
    const cachedPerformance = state.lastPerformanceCache.get(exerciseTableId);
    if (cachedPerformance) {
      const cachedSet = cachedPerformance.sets.find((s) => s.setNumber === setNumber);
      if (cachedSet) {
        // Return a SessionSet-like object
        return {
          id: `cached-${exerciseTableId}-${setNumber}`,
          setNumber: cachedSet.setNumber,
          targetReps: cachedSet.actualReps || 0,
          targetWeight: cachedSet.actualWeight,
          actualReps: cachedSet.actualReps,
          actualWeight: cachedSet.actualWeight,
          rpe: cachedSet.rpe,
          completedAt: cachedPerformance.completedAt,
        } as SessionSet;
      }
    }

    // Fall back to lastSession for this workout
    if (!state.lastSession) return null;

    // First try to match by workoutItemExerciseId (for original exercises)
    let lastExercise = state.lastSession.exercises.find(
      (e) => e.workoutItemExercise?.id === currentExercise.workoutItemExercise?.id
    );

    // If not found and exercise was substituted, try to match by exerciseId
    // This handles cases where user substituted with same exercise they did before
    if (!lastExercise && currentExercise.substitutedFromId) {
      lastExercise = state.lastSession.exercises.find(
        (e) => (e.exerciseId || e.exercise?.id) === exerciseTableId
      );
    }

    // Also try by exerciseId for exercises that were never in the workout template
    // but might have been done in previous sessions
    if (!lastExercise) {
      lastExercise = state.lastSession.exercises.find(
        (e) => (e.exerciseId || e.exercise?.id) === exerciseTableId
      );
    }

    if (!lastExercise) return null;

    return lastExercise.sets.find((s) => s.setNumber === setNumber) || null;
  },

  getActiveExercises: () => {
    const state = get();
    if (!state.session) return [];
    return state.session.exercises.filter(
      (e) => e.status !== "substituted" && e.status !== "skipped"
    );
  },

  isLastSet: () => {
    const exercise = get().getCurrentExercise();
    const state = get();
    if (!exercise) return true;
    return state.currentSetIndex >= exercise.sets.length - 1;
  },

  isLastExercise: () => {
    const state = get();
    const activeExercises = state.getActiveExercises();
    return state.currentExerciseIndex >= activeExercises.length - 1;
  },
}));
