"use client";

import { Button } from "@/components/ui/button";
import { ExerciseOptionsBar } from "../exercise-options-bar";
import { ExerciseCard, ExerciseItemData } from "../exercise-card";

interface ExerciseOverviewData {
  id: string;
  name: string;
  muscleGroups: string[];
  totalSets: number;
  firstSetTarget: { reps: number; weight: number | null };
}

interface SupersetOverviewData {
  workoutItemId: string;
  rounds: number;
  exercises: ExerciseOverviewData[];
}

export type OverviewItem =
  | { type: "exercise"; data: ExerciseOverviewData }
  | { type: "superset"; data: SupersetOverviewData };

interface SessionOverviewScreenProps {
  items: OverviewItem[];
  onStart: () => void;
  onSkipFirst: () => void;
  onReorder: () => void;
  onSubstituteFirst: () => void;
  isSubmitting?: boolean;
}

export function SessionOverviewScreen({
  items,
  onStart,
  onSkipFirst,
  onReorder,
  onSubstituteFirst,
  isSubmitting = false,
}: SessionOverviewScreenProps) {
  const firstItem = items[0];
  const remainingItems = items.slice(1);

  // Count total exercises for header display
  const totalExercises = items.reduce((count, item) => {
    if (item.type === "exercise") return count + 1;
    return count + item.data.exercises.length;
  }, 0);

  // Get label for first item
  const getFirstItemLabel = () => {
    if (!firstItem) return "";
    if (firstItem.type === "superset") return "Premier superset";
    return "Premier exercice";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center pt-4 pb-8 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-300" />
          </span>
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {totalExercises} exercice{totalExercises > 1 ? "s" : ""} au programme
          </span>
        </div>
      </div>

      {/* Exercises list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-8">
          {/* First item - highlighted */}
          {firstItem && (
            <div className="space-y-3">
              <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                {getFirstItemLabel()}
              </div>
              <OverviewItemCard item={firstItem} />
              {/* Options for first item */}
              <ExerciseOptionsBar
                onSkip={onSkipFirst}
                onPostpone={onReorder}
                onSubstitute={onSubstituteFirst}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Remaining items */}
          {remainingItems.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                À suivre
              </div>
              {remainingItems.map((item) => (
                <OverviewItemCard
                  key={item.type === "exercise" ? item.data.id : item.data.workoutItemId}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start button */}
      <div className="sticky bottom-0 pt-4 bg-linear-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-2">
        <Button
          onClick={onStart}
          disabled={isSubmitting || items.length === 0}
          size="xl"
          className="w-full"
        >
          Commencer la séance
        </Button>
      </div>
    </div>
  );
}

interface OverviewItemCardProps {
  item: OverviewItem;
}

function OverviewItemCard({ item }: OverviewItemCardProps) {
  if (item.type === "exercise") {
    const exercise: ExerciseItemData = {
      name: item.data.name,
      muscleGroups: item.data.muscleGroups,
    };
    return (
      <ExerciseCard
        variant="minimal"
        type="standard"
        totalSets={item.data.totalSets}
        exercise={exercise}
      />
    );
  }

  // Superset
  const exercises: ExerciseItemData[] = item.data.exercises.map((ex) => ({
    name: ex.name,
    muscleGroups: ex.muscleGroups,
  }));
  return (
    <ExerciseCard
      variant="minimal"
      type="superset"
      totalSets={item.data.rounds}
      exercises={exercises}
    />
  );
}
