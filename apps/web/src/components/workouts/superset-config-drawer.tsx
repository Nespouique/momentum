"use client";

import { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { WorkoutItemFormData } from "./types";

const REST_PRESETS = [
  { label: "30s", value: 30 },
  { label: "1:00", value: 60 },
  { label: "1:30", value: 90 },
  { label: "2:00", value: 120 },
  { label: "3:00", value: 180 },
];

interface SupersetConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WorkoutItemFormData | null;
  onSave: (item: WorkoutItemFormData) => void;
  onEditExercises: () => void;
}

export function SupersetConfigDrawer({
  open,
  onOpenChange,
  item,
  onSave,
  onEditExercises,
}: SupersetConfigDrawerProps) {
  const [rounds, setRounds] = useState(3);
  const [restBetweenRounds, setRestBetweenRounds] = useState(60);

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setRounds(item.rounds);
      setRestBetweenRounds(item.restBetweenRounds);
    }
  }, [item]);

  if (!item) return null;

  // Handle rest change
  const handleRestChange = (value: number | null) => {
    setRestBetweenRounds(value ?? 0);
  };

  // Save and close
  const handleSave = () => {
    onSave({
      ...item,
      rounds,
      restBetweenRounds,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>Configurer le superset</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1 -mx-1 space-y-6">
          {/* Edit exercises button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onEditExercises}
          >
            <Dumbbell className="h-4 w-4" />
            Sélection des exercices
          </Button>

          <Separator />

          {/* Number of rounds */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Nombre de séries</label>
            <NumberInput
              value={rounds}
              onChange={(v) => setRounds(v ?? 1)}
              min={1}
              max={10}
              className="w-28"
            />
          </div>

          <Separator />

          {/* Rest between rounds */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Repos entre les séries
            </label>

            {/* Time inputs */}
            <div className="flex items-start justify-center gap-3 mb-4">
              <div className="text-center">
                <NumberInput
                  value={Math.floor(restBetweenRounds / 60)}
                  onChange={(v) => {
                    const minutes = v ?? 0;
                    const seconds = restBetweenRounds % 60;
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
                  value={restBetweenRounds % 60}
                  onChange={(v) => {
                    const minutes = Math.floor(restBetweenRounds / 60);
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
                  min={Math.floor(restBetweenRounds / 60) === 0 ? 0 : undefined}
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
                      restBetweenRounds === preset.value &&
                        "border-orange-500/50 bg-orange-500/10 text-orange-400"
                    )}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
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
