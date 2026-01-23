"use client";

import { ExerciseCard, ExerciseItemData } from "./exercise-card";

interface SetPreviewData {
  setNumber: number;
  totalSets: number;
  targetReps: number;
  targetWeight: number | null;
  lastReps?: number | null;
  lastWeight?: number | null;
}

export interface ExercisePreviewData {
  name: string;
  muscleGroups: string[];
  totalSets: number;
  firstSetTarget: { reps: number; weight: number | null };
  lastFirstSet?: { reps: number | null; weight: number | null } | null;
}

export interface SupersetExercisePreview {
  name: string;
  muscleGroups: string[];
  firstSetTarget: { reps: number; weight: number | null };
  lastFirstSet?: { reps: number | null; weight: number | null } | null;
}

export interface SupersetPreviewData {
  totalSets: number;
  exercises: SupersetExercisePreview[];
}

type NextPreviewProps =
  | {
      type: "set";
      setData: SetPreviewData;
      exerciseData?: never;
      supersetData?: never;
    }
  | {
      type: "exercise";
      exerciseData: ExercisePreviewData;
      setData?: never;
      supersetData?: never;
    }
  | {
      type: "superset";
      supersetData: SupersetPreviewData;
      setData?: never;
      exerciseData?: never;
    };

export function NextPreview({ type, setData, exerciseData, supersetData }: NextPreviewProps) {
  if (type === "set" && setData) {
    return <SetPreview data={setData} />;
  }

  if (type === "exercise" && exerciseData) {
    const exercise: ExerciseItemData = {
      name: exerciseData.name,
      muscleGroups: exerciseData.muscleGroups,
      firstSetTarget: exerciseData.firstSetTarget,
      lastFirstSet: exerciseData.lastFirstSet,
    };
    return (
      <ExerciseCard
        variant="next"
        type="standard"
        totalSets={exerciseData.totalSets}
        exercise={exercise}
      />
    );
  }

  if (type === "superset" && supersetData) {
    const exercises: ExerciseItemData[] = supersetData.exercises.map((ex) => ({
      name: ex.name,
      muscleGroups: ex.muscleGroups,
      firstSetTarget: ex.firstSetTarget,
      lastFirstSet: ex.lastFirstSet,
    }));
    return (
      <ExerciseCard
        variant="next"
        type="superset"
        totalSets={supersetData.totalSets}
        exercises={exercises}
      />
    );
  }

  return null;
}

function SetPreview({ data }: { data: SetPreviewData }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-2">
        Prochaine série
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-400">
            Série {data.setNumber}/{data.totalSets}
          </div>
          <div className="text-lg font-semibold text-zinc-100 mt-0.5">
            {data.targetReps} reps @ {data.targetWeight ?? 0}kg
          </div>
        </div>

        {data.lastReps !== undefined && data.lastReps !== null && (
          <div className="text-right">
            <div className="text-xs text-zinc-500">Dernière fois</div>
            <div className="flex items-center gap-1.5 text-sm text-zinc-400 mt-0.5">
              <span>
                {data.lastReps} reps{data.lastWeight !== null && ` @ ${data.lastWeight}kg`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
