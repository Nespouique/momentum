"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { MuscleGroupFilter, MuscleGroupBadge } from "@/components/exercises";
import { useAuthStore } from "@/stores/auth";
import { getExercises, type Exercise } from "@/lib/api/exercises";
import { MuscleGroup } from "@/lib/constants/muscle-groups";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExerciseSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "multi";
  onSelect: (exercises: Exercise[]) => void;
  title?: string;
  minSelection?: number;
  initialSelection?: Exercise[];
}

export function ExerciseSelector({
  open,
  onOpenChange,
  mode,
  onSelect,
  title,
  minSelection = mode === "multi" ? 2 : 1,
  initialSelection = [],
}: ExerciseSelectorProps) {
  const { token } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  // Load exercises
  const loadExercises = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const data = await getExercises(token);
      setExercises(data.data);
    } catch (error) {
      console.error("Failed to load exercises:", error);
      toast.error("Erreur lors du chargement des exercices");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      loadExercises();
      setSelectedExercises(initialSelection);
      setSearchQuery("");
      setSelectedMuscleGroups([]);
    }
  }, [open, loadExercises, initialSelection]);

  // Filter exercises - AND logic for muscle groups (must have ALL selected groups)
  const filteredExercises = useMemo(() => {
    let result = exercises;

    if (selectedMuscleGroups.length > 0) {
      result = result.filter((exercise) =>
        selectedMuscleGroups.every((group) => exercise.muscleGroups.includes(group))
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((exercise) =>
        exercise.name.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [exercises, selectedMuscleGroups, searchQuery]);

  // Handle exercise toggle
  const handleExerciseToggle = (exercise: Exercise) => {
    if (mode === "single") {
      onSelect([exercise]);
      onOpenChange(false);
    } else {
      setSelectedExercises((prev) => {
        const isSelected = prev.some((e) => e.id === exercise.id);
        if (isSelected) {
          return prev.filter((e) => e.id !== exercise.id);
        }
        return [...prev, exercise];
      });
    }
  };

  // Handle confirm for multi-select
  const handleConfirm = () => {
    if (selectedExercises.length >= minSelection) {
      onSelect(selectedExercises);
      onOpenChange(false);
    }
  };

  const isSelected = (exercise: Exercise) =>
    selectedExercises.some((e) => e.id === exercise.id);

  const defaultTitle = mode === "single"
    ? "Sélectionner un exercice"
    : `Sélectionner des exercices (${minSelection} min.)`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>{title ?? defaultTitle}</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative my-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-zinc-900/50 border-zinc-800"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Muscle group filter */}
        <div className="shrink-0 mb-4">
          <MuscleGroupFilter
            selected={selectedMuscleGroups}
            onChange={setSelectedMuscleGroups}
          />
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/50" />
              ))}
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun exercice trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleExerciseToggle(exercise)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left",
                    "transition-all duration-200",
                    isSelected(exercise)
                      ? "bg-orange-500/10 border-orange-500/50"
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {mode === "multi" && (
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                          isSelected(exercise)
                            ? "bg-orange-500 border-orange-500"
                            : "border-zinc-600"
                        )}
                      >
                        {isSelected(exercise) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-100 truncate">
                        {exercise.name}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[...exercise.muscleGroups]
                          .sort((a, b) => a.localeCompare(b, "fr"))
                          .map((group) => (
                            <MuscleGroupBadge
                              key={group}
                              group={group as MuscleGroup}
                              size="sm"
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer for multi-select */}
        {mode === "multi" && (
          <SheetFooter className="shrink-0 mt-4 flex-row items-center gap-2">
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedExercises.length} sélectionné{selectedExercises.length > 1 ? "s" : ""}
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selectedExercises.length < minSelection}
            >
              Confirmer
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
