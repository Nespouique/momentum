"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  WorkoutItemExerciseFormData,
  WorkoutSetFormData,
  generateId,
} from "./types";

const REST_PRESETS = [
  { label: "30s", value: 30 },
  { label: "1:00", value: 60 },
  { label: "1:30", value: 90 },
  { label: "2:00", value: 120 },
  { label: "3:00", value: 180 },
];

interface ExerciseConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: WorkoutItemExerciseFormData | null;
  onSave: (exercise: WorkoutItemExerciseFormData) => void;
  isSuperset?: boolean;
}

export function ExerciseConfigDrawer({
  open,
  onOpenChange,
  exercise,
  onSave,
  isSuperset = false,
}: ExerciseConfigDrawerProps) {
  const [formData, setFormData] = useState<WorkoutItemExerciseFormData | null>(null);

  // Initialize form data when exercise changes
  useEffect(() => {
    if (exercise) {
      setFormData({ ...exercise });
    }
  }, [exercise]);

  if (!formData) return null;

  // Update set count
  const handleSetCountChange = (count: number | null) => {
    if (count === null || count < 1) return;

    const currentCount = formData.sets.length;
    let newSets: WorkoutSetFormData[];

    if (count > currentCount) {
      // Add new sets
      const lastSet = formData.sets[currentCount - 1];
      const newSetEntries = Array.from({ length: count - currentCount }, (_, i) => ({
        id: generateId(),
        setNumber: currentCount + i + 1,
        targetReps: lastSet?.targetReps ?? 10,
        targetWeight: lastSet?.targetWeight ?? null,
      }));
      newSets = [...formData.sets, ...newSetEntries];
    } else {
      // Remove sets
      newSets = formData.sets.slice(0, count);
    }

    // Renumber sets
    newSets = newSets.map((set, i) => ({ ...set, setNumber: i + 1 }));

    setFormData({ ...formData, sets: newSets });
  };

  // Update same reps for all
  const handleSameRepsChange = (checked: boolean) => {
    if (checked && formData.sets.length > 0) {
      const firstReps = formData.sets[0]!.targetReps;
      const newSets = formData.sets.map((set) => ({
        ...set,
        targetReps: firstReps,
      }));
      setFormData({ ...formData, sameRepsForAll: true, sets: newSets });
    } else {
      setFormData({ ...formData, sameRepsForAll: false });
    }
  };

  // Update same weight for all
  const handleSameWeightChange = (checked: boolean) => {
    if (checked && formData.sets.length > 0) {
      const firstWeight = formData.sets[0]!.targetWeight;
      const newSets = formData.sets.map((set) => ({
        ...set,
        targetWeight: firstWeight,
      }));
      setFormData({ ...formData, sameWeightForAll: true, sets: newSets });
    } else {
      setFormData({ ...formData, sameWeightForAll: false });
    }
  };

  // Update individual set (syncs all if linked)
  const handleSetValueChange = (
    setIndex: number,
    field: "targetReps" | "targetWeight",
    value: number | null
  ) => {
    const isLinked =
      (field === "targetReps" && formData.sameRepsForAll) ||
      (field === "targetWeight" && formData.sameWeightForAll);

    const newSets = isLinked
      ? formData.sets.map((set) => ({ ...set, [field]: value }))
      : formData.sets.map((set, index) =>
          index === setIndex ? { ...set, [field]: value } : set
        );

    setFormData({ ...formData, sets: newSets });
  };

  // Update rest between sets
  const handleRestChange = (value: number | null) => {
    setFormData({ ...formData, restBetweenSets: value ?? 0 });
  };

  // Save and close
  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span>Configurer : {formData.exercise.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1 -mx-1 space-y-6">
          {/* Number of sets (not shown for superset exercises) */}
          {!isSuperset && (
            <>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Nombre de séries</label>
                <NumberInput
                  value={formData.sets.length}
                  onChange={handleSetCountChange}
                  min={1}
                  max={10}
                  className="w-28"
                />
              </div>

              <Separator />
            </>
          )}

          {/* Checkboxes for unified values */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={formData.sameRepsForAll}
                onCheckedChange={handleSameRepsChange}
              />
              <span className="text-sm">Mêmes reps pour toutes les séries</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={formData.sameWeightForAll}
                onCheckedChange={handleSameWeightChange}
              />
              <span className="text-sm">Même poids pour toutes les séries</span>
            </label>
          </div>

          <Separator />

          {/* Sets configuration */}
          <div>
            <h4 className="text-sm font-medium mb-3">Configuration par série</h4>
            <div className="space-y-2">
              {formData.sets.map((set, index) => (
                <div
                  key={set.id}
                  className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-3">
                    Série {set.setNumber}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Reps</span>
                      <NumberInput
                        value={set.targetReps}
                        onChange={(v) => handleSetValueChange(index, "targetReps", v)}
                        min={1}
                        max={100}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Poids (kg)</span>
                      <NumberInput
                        value={set.targetWeight}
                        onChange={(v) => handleSetValueChange(index, "targetWeight", v)}
                        min={0}
                        max={500}
                        step={0.5}
                        placeholder="—"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Rest between sets (not for superset exercises) */}
          {!isSuperset && (
            <div>
              <label className="text-sm font-medium mb-3 block">
                Repos entre les séries
              </label>

              {/* Time inputs */}
              <div className="flex items-start justify-center gap-3 mb-4">
                <div className="text-center">
                  <NumberInput
                    value={Math.floor(formData.restBetweenSets / 60)}
                    onChange={(v) => {
                      const minutes = v ?? 0;
                      const seconds = formData.restBetweenSets % 60;
                      handleRestChange(minutes * 60 + seconds);
                    }}
                    min={0}
                    max={10}
                    step={1}
                    className="w-28"
                  />
                  <span className="text-xs text-muted-foreground mt-1.5 block">min</span>
                </div>
                <span className="text-2xl font-bold text-muted-foreground h-9 flex items-center">:</span>
                <div className="text-center">
                  <NumberInput
                    value={formData.restBetweenSets % 60}
                    onChange={(v) => {
                      const minutes = Math.floor(formData.restBetweenSets / 60);
                      const newSeconds = v ?? 0;

                      if (newSeconds >= 60) {
                        if (minutes < 10) {
                          handleRestChange((minutes + 1) * 60);
                        }
                      } else if (newSeconds < 0) {
                        if (minutes > 0) {
                          handleRestChange((minutes - 1) * 60 + 45);
                        } else {
                          handleRestChange(0);
                        }
                      } else {
                        handleRestChange(minutes * 60 + newSeconds);
                      }
                    }}
                    min={Math.floor(formData.restBetweenSets / 60) === 0 ? 0 : undefined}
                    step={15}
                    className="w-28"
                  />
                  <span className="text-xs text-muted-foreground mt-1.5 block">sec</span>
                </div>
              </div>

              {/* Presets */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Raccourcis</p>
                <div className="flex flex-wrap gap-2">
                  {REST_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestChange(preset.value)}
                      className={cn(
                        "flex-1 min-w-[50px]",
                        formData.restBetweenSets === preset.value &&
                          "border-orange-500/50 bg-orange-500/10 text-orange-400"
                      )}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isSuperset && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <p className="text-sm text-purple-300 text-center">
                Le nombre de séries et le temps de repos sont définis au niveau global du superset.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-4 border-t border-zinc-800">
          <Button onClick={handleSave} className="w-full">
            Appliquer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
