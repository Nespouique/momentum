"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarClock, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultInput } from "@/components/session/result-input";
import { useAuthStore } from "@/stores/auth";
import {
  getSession,
  updateSet,
  type WorkoutSession,
  type SessionExercise,
} from "@/lib/api/sessions";
import { toast } from "sonner";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params["id"] as string;
  const { token } = useAuthStore();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modifications, setModifications] = useState<
    Map<string, { reps: number; weight: number }>
  >(new Map());

  // Load session
  const loadSession = useCallback(async () => {
    if (!token || !sessionId) return;

    setIsLoading(true);
    try {
      const result = await getSession(token, sessionId);
      setSession(result.data);
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Erreur lors du chargement de la séance");
      router.push("/workouts");
    } finally {
      setIsLoading(false);
    }
  }, [token, sessionId, router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Format duration
  const formatDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return "En cours";
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h${mins.toString().padStart(2, "0")}`;
    }
    return `${mins} min`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Handle set change
  const handleSetChange = useCallback(
    (
      setId: string,
      originalValue: { reps: number; weight: number },
      newValue: { reps: number; weight: number }
    ) => {
      setModifications((prev) => {
        const next = new Map(prev);
        if (
          newValue.reps !== originalValue.reps ||
          newValue.weight !== originalValue.weight
        ) {
          next.set(setId, newValue);
        } else {
          next.delete(setId);
        }
        return next;
      });
    },
    []
  );

  // Get current value for a set
  const getSetValue = useCallback(
    (set: SessionExercise["sets"][number]) => {
      const modified = modifications.get(set.id);
      if (modified) return modified;
      return {
        reps: set.actualReps ?? set.targetReps,
        weight: set.actualWeight ?? set.targetWeight ?? 0,
      };
    },
    [modifications]
  );

  // Save modifications
  const handleSave = useCallback(async () => {
    if (!token || !session || modifications.size === 0) return;

    setIsSaving(true);
    try {
      // Update each modified set
      const updatePromises = Array.from(modifications.entries()).map(
        ([setId, value]) =>
          updateSet(token, session.id, setId, {
            actualReps: value.reps,
            actualWeight: value.weight,
          })
      );

      await Promise.all(updatePromises);
      toast.success("Modifications enregistrées");
      setModifications(new Map());
      // Reload to get fresh data
      loadSession();
    } catch (error) {
      console.error("Failed to save modifications:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }, [token, session, modifications, loadSession]);

  // Loading state
  if (isLoading || !session) {
    return (
      <div className="pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-zinc-800/80 bg-zinc-900/40"
            />
          ))}
        </div>
      </div>
    );
  }

  // Filter exercises with completed sets
  const completedExercises = session.exercises.filter((ex) =>
    ex.sets.some((s) => s.actualReps !== null)
  );

  const hasModifications = modifications.size > 0;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {session.workout.name}
          </h1>
        </div>

        {/* Session info */}
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            {formatDate(session.completedAt || session.startedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatDuration(session.startedAt, session.completedAt)}
          </span>
        </div>
      </div>

      {/* Exercises list */}
      <div className="space-y-4 mb-6">
        {completedExercises.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun exercice complété dans cette séance
          </div>
        ) : (
          completedExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              getSetValue={getSetValue}
              onSetChange={handleSetChange}
            />
          ))
        )}
      </div>

      {/* Save button - at bottom when there are modifications */}
      {hasModifications && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="xl"
          className="w-full gap-2"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
              Enregistrement...
            </span>
          ) : (
            <>
              Enregistrer les modifications
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface ExerciseCardProps {
  exercise: SessionExercise;
  getSetValue: (
    set: SessionExercise["sets"][number]
  ) => { reps: number; weight: number };
  onSetChange: (
    setId: string,
    originalValue: { reps: number; weight: number },
    newValue: { reps: number; weight: number }
  ) => void;
}

function ExerciseCard({
  exercise,
  getSetValue,
  onSetChange,
}: ExerciseCardProps) {
  // Only show completed sets
  const completedSets = exercise.sets.filter((s) => s.actualReps !== null);

  if (completedSets.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {/* Exercise header */}
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <h3 className="font-semibold text-zinc-100">{exercise.exercise.name}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {completedSets.length} série{completedSets.length > 1 ? "s" : ""}{" "}
          complétée{completedSets.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Sets list */}
      <div className="divide-y divide-zinc-800/50">
        {completedSets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            value={getSetValue(set)}
            onChange={(newValue) => {
              const originalValue = {
                reps: set.actualReps ?? set.targetReps,
                weight: set.actualWeight ?? set.targetWeight ?? 0,
              };
              onSetChange(set.id, originalValue, newValue);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface SetRowProps {
  set: SessionExercise["sets"][number];
  value: { reps: number; weight: number };
  onChange: (value: { reps: number; weight: number }) => void;
}

function SetRow({ set, value, onChange }: SetRowProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Set number badge */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900">
          {set.setNumber}
        </div>

        {/* Compact stepper controls */}
        <div className="flex-1">
          <ResultInput
            exerciseName=""
            targetReps={set.targetReps}
            targetWeight={set.targetWeight}
            value={value}
            onChange={onChange}
            showObjective={false}
            compact
            hideHeader
          />
        </div>
      </div>
    </div>
  );
}
