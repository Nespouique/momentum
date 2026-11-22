import {
  localDateKey,
  buildBuckets,
  type Bucket,
  type Granularity,
  type ResolvedPeriod,
} from "./period.js";
import {
  MAX_PLAUSIBLE_DURATION_MINUTES,
  SKIPPED_EXERCISE_STATUSES,
  addSetMetrics,
  computeSetMetrics,
  computeTargetMetrics,
  durationMinutes,
  round1,
  type SetInput,
  type SetMetrics,
  type TargetMetrics,
} from "./metrics.js";

export type SessionStatusValue = "in_progress" | "completed" | "abandoned";
export type SessionTypeValue = "planned" | "ad_hoc";

export interface LoadedExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  status: string;
  position: number;
  sets: SetInput[];
}

export interface LoadedSession {
  id: string;
  type: SessionTypeValue;
  status: SessionStatusValue;
  startedAt: Date;
  completedAt: Date | null;
  workoutId: string | null;
  workoutName: string | null;
  notes: string | null;
  exercises: LoadedExercise[];
}

export interface Totals {
  sets: number;
  reps: number;
  volumeKg: number;
}

export function isPerformedExercise(exercise: LoadedExercise): boolean {
  return !(SKIPPED_EXERCISE_STATUSES as readonly string[]).includes(exercise.status);
}

export function exerciseMetrics(exercise: LoadedExercise): SetMetrics {
  return computeSetMetrics(exercise.sets);
}

export function sessionTotals(session: LoadedSession): Totals {
  const totals: Totals = { sets: 0, reps: 0, volumeKg: 0 };
  for (const exercise of session.exercises) {
    if (!isPerformedExercise(exercise)) continue;
    addSetMetrics(totals, exerciseMetrics(exercise));
  }
  return totals;
}

export function sessionDate(session: LoadedSession, timezone: string): string {
  return localDateKey(session.startedAt, timezone);
}

export interface DurationStats {
  totalMinutes: number;
  averageMinutes: number | null;
  samples: number;
  ignoredOverLimit: number;
}

export function durationStats(sessions: LoadedSession[]): DurationStats {
  let total = 0;
  let samples = 0;
  let ignored = 0;
  for (const session of sessions) {
    const minutes = durationMinutes(session.startedAt, session.completedAt);
    if (minutes === null) continue;
    if (minutes > MAX_PLAUSIBLE_DURATION_MINUTES) {
      ignored += 1;
      continue;
    }
    total += minutes;
    samples += 1;
  }
  return {
    totalMinutes: round1(total),
    averageMinutes: samples > 0 ? round1(total / samples) : null,
    samples,
    ignoredOverLimit: ignored,
  };
}

export interface TargetTotals {
  plannedSets: number;
  setsMetTarget: number;
  targetVolumeKg: number;
  volumePercentOfTarget: number | null;
}

export interface PeriodSummary {
  sessions: {
    completed: number;
    planned: number;
    adHoc: number;
    activeDays: number;
    perWeekAverage: number | null;
    inProgress: number;
    abandoned: number;
  };
  totals: Totals;
  /** Planned targets of the performed exercises, to read results against their goals. */
  targets: TargetTotals;
  distinctExercises: number;
  duration: DurationStats;
}

/** Aggregates completed sessions only; other statuses are only counted. */
export function summarizeSessions(
  sessions: LoadedSession[],
  period: ResolvedPeriod
): PeriodSummary {
  const completed = sessions.filter((session) => session.status === "completed");
  const totals: Totals = { sets: 0, reps: 0, volumeKg: 0 };
  const exercises = new Set<string>();
  const days = new Set<string>();
  let plannedSets = 0;
  let setsMetTarget = 0;
  let targetVolume = 0;
  let volumeOfTargetedSets = 0;

  for (const session of completed) {
    addSetMetrics(totals, sessionTotals(session));
    days.add(sessionDate(session, period.timezone));
    for (const exercise of session.exercises) {
      if (!isPerformedExercise(exercise)) continue;
      const metrics = exerciseMetrics(exercise);
      if (metrics.sets > 0) exercises.add(exercise.exerciseId);
      const target = computeTargetMetrics(exercise.sets);
      plannedSets += target.sets;
      setsMetTarget += target.setsMetTarget;
      if (target.volumeKg > 0) {
        targetVolume += target.volumeKg;
        volumeOfTargetedSets += metrics.volumeKg;
      }
    }
  }

  return {
    sessions: {
      completed: completed.length,
      planned: completed.filter((session) => session.type === "planned").length,
      adHoc: completed.filter((session) => session.type === "ad_hoc").length,
      activeDays: days.size,
      perWeekAverage: period.days >= 7 ? round1(completed.length / (period.days / 7)) : null,
      inProgress: sessions.filter((session) => session.status === "in_progress").length,
      abandoned: sessions.filter((session) => session.status === "abandoned").length,
    },
    totals,
    targets: {
      plannedSets,
      setsMetTarget,
      targetVolumeKg: round1(targetVolume),
      volumePercentOfTarget:
        targetVolume > 0 ? round1((volumeOfTargetedSets / targetVolume) * 100) : null,
    },
    distinctExercises: exercises.size,
    duration: durationStats(completed),
  };
}

export interface TimeseriesBucket extends Bucket {
  sessions: number;
  durationMinutes: number;
  sets: number;
  reps: number;
  volumeKg: number;
}

export function bucketSessions(
  sessions: LoadedSession[],
  period: ResolvedPeriod,
  granularity: Granularity
): TimeseriesBucket[] {
  const buckets: TimeseriesBucket[] = buildBuckets(period, granularity).map((bucket) => ({
    ...bucket,
    sessions: 0,
    durationMinutes: 0,
    sets: 0,
    reps: 0,
    volumeKg: 0,
  }));

  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const day = sessionDate(session, period.timezone);
    const bucket = buckets.find((candidate) => day >= candidate.from && day <= candidate.to);
    if (!bucket) continue;
    const totals = sessionTotals(session);
    bucket.sessions += 1;
    bucket.sets += totals.sets;
    bucket.reps += totals.reps;
    bucket.volumeKg = round1(bucket.volumeKg + totals.volumeKg);
    const minutes = durationMinutes(session.startedAt, session.completedAt);
    if (minutes !== null && minutes <= MAX_PLAUSIBLE_DURATION_MINUTES) {
      bucket.durationMinutes = round1(bucket.durationMinutes + minutes);
    }
  }
  return buckets;
}

export interface ExerciseSessionEntry extends SetMetrics {
  sessionId: string;
  date: string;
  type: SessionTypeValue;
  workoutName: string | null;
  /** Targets of all planned sets of the session (performed or not). */
  target: TargetMetrics;
  /** All planned sets with target and result; `reps` is null when no result was recorded. */
  sessionSets: Array<{
    setNumber: number;
    reps: number | null;
    weightKg: number | null;
    targetReps: number;
    targetWeightKg: number | null;
  }>;
}

/** Per-session performance of one exercise, oldest first, completed sessions only. */
export function exerciseHistory(
  sessions: LoadedSession[],
  exerciseId: string,
  timezone: string
): ExerciseSessionEntry[] {
  const entries: ExerciseSessionEntry[] = [];
  const ordered = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  for (const session of ordered) {
    if (session.status !== "completed") continue;
    const performed = session.exercises.filter(
      (exercise) => exercise.exerciseId === exerciseId && isPerformedExercise(exercise)
    );
    const sets = performed.flatMap((exercise) => exercise.sets);
    const metrics = computeSetMetrics(sets);
    if (metrics.sets === 0) continue;
    entries.push({
      ...metrics,
      sessionId: session.id,
      date: sessionDate(session, timezone),
      type: session.type,
      workoutName: session.workoutName,
      target: computeTargetMetrics(sets),
      sessionSets: sets.map((set) => ({
        setNumber: set.setNumber,
        reps: set.actualReps,
        weightKg:
          set.actualReps !== null && set.actualWeight && set.actualWeight > 0
            ? set.actualWeight
            : null,
        targetReps: set.targetReps,
        targetWeightKg: set.targetWeight && set.targetWeight > 0 ? set.targetWeight : null,
      })),
    });
  }
  return entries;
}

export interface RankedExercise {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
  sessions: number;
  sets: number;
  reps: number;
  volumeKg: number;
  lastPerformed: string;
}

export type RankMetric = "sessions" | "sets" | "reps" | "volume";

export function rankExercises(
  sessions: LoadedSession[],
  metric: RankMetric,
  timezone: string
): RankedExercise[] {
  const map = new Map<string, RankedExercise>();

  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const date = sessionDate(session, timezone);
    const seenInSession = new Set<string>();

    for (const exercise of session.exercises) {
      if (!isPerformedExercise(exercise)) continue;
      const metrics = exerciseMetrics(exercise);
      if (metrics.sets === 0) continue;

      let entry = map.get(exercise.exerciseId);
      if (!entry) {
        entry = {
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
          sessions: 0,
          sets: 0,
          reps: 0,
          volumeKg: 0,
          lastPerformed: date,
        };
        map.set(exercise.exerciseId, entry);
      }
      if (!seenInSession.has(exercise.exerciseId)) {
        entry.sessions += 1;
        seenInSession.add(exercise.exerciseId);
      }
      addSetMetrics(entry, metrics);
      if (date > entry.lastPerformed) entry.lastPerformed = date;
    }
  }

  const value = (entry: RankedExercise): number =>
    metric === "volume" ? entry.volumeKg : metric === "sessions" ? entry.sessions : entry[metric];

  return [...map.values()].sort(
    (a, b) => value(b) - value(a) || b.sessions - a.sessions || a.name.localeCompare(b.name, "fr")
  );
}

export interface MuscleGroupEntry {
  muscleGroup: string;
  sessions: number;
  sets: number;
  reps: number;
  volumeKg: number;
}

/** An exercise counts fully toward each of its muscle groups. */
export function muscleGroupBreakdown(sessions: LoadedSession[]): {
  groups: MuscleGroupEntry[];
  setsWithoutMuscleGroup: number;
} {
  const map = new Map<string, MuscleGroupEntry & { seen: Set<string> }>();
  let withoutGroup = 0;

  for (const session of sessions) {
    if (session.status !== "completed") continue;
    for (const exercise of session.exercises) {
      if (!isPerformedExercise(exercise)) continue;
      const metrics = exerciseMetrics(exercise);
      if (metrics.sets === 0) continue;
      if (exercise.muscleGroups.length === 0) {
        withoutGroup += metrics.sets;
        continue;
      }
      for (const group of exercise.muscleGroups) {
        let entry = map.get(group);
        if (!entry) {
          entry = {
            muscleGroup: group,
            sessions: 0,
            sets: 0,
            reps: 0,
            volumeKg: 0,
            seen: new Set(),
          };
          map.set(group, entry);
        }
        if (!entry.seen.has(session.id)) {
          entry.seen.add(session.id);
          entry.sessions += 1;
        }
        addSetMetrics(entry, metrics);
      }
    }
  }

  const groups = [...map.values()]
    .map(
      (entry): MuscleGroupEntry => ({
        muscleGroup: entry.muscleGroup,
        sessions: entry.sessions,
        sets: entry.sets,
        reps: entry.reps,
        volumeKg: entry.volumeKg,
      })
    )
    .sort((a, b) => b.sets - a.sets || a.muscleGroup.localeCompare(b.muscleGroup, "fr"));
  return { groups, setsWithoutMuscleGroup: withoutGroup };
}

export interface PersonalRecords {
  exerciseId: string;
  name: string;
  sessions: number;
  maxWeight: { weightKg: number; reps: number; date: string } | null;
  bestE1RM: { e1rmKg: number; weightKg: number; reps: number; date: string } | null;
  maxReps: { reps: number; weightKg: number | null; date: string } | null;
  bestSessionVolume: { volumeKg: number; date: string } | null;
}

export function personalRecords(sessions: LoadedSession[], timezone: string): PersonalRecords[] {
  const ranked = rankExercises(sessions, "sessions", timezone);
  const records: PersonalRecords[] = [];

  for (const exercise of ranked) {
    const history = exerciseHistory(sessions, exercise.exerciseId, timezone);
    const record: PersonalRecords = {
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      sessions: history.length,
      maxWeight: null,
      bestE1RM: null,
      maxReps: null,
      bestSessionVolume: null,
    };

    for (const entry of history) {
      if (entry.maxWeightKg !== null) {
        const current = record.maxWeight;
        if (
          !current ||
          entry.maxWeightKg > current.weightKg ||
          (entry.maxWeightKg === current.weightKg && (entry.repsAtMaxWeight ?? 0) > current.reps)
        ) {
          record.maxWeight = {
            weightKg: entry.maxWeightKg,
            reps: entry.repsAtMaxWeight ?? 0,
            date: entry.date,
          };
        }
      }
      if (
        entry.bestE1RM !== null &&
        (!record.bestE1RM || entry.bestE1RM > record.bestE1RM.e1rmKg)
      ) {
        const candidates = entry.sessionSets.flatMap((set) =>
          set.reps !== null && set.reps > 0 && set.weightKg !== null
            ? [{ reps: set.reps, weightKg: set.weightKg }]
            : []
        );
        const best = candidates.sort(
          (a, b) => b.weightKg * (1 + b.reps / 30) - a.weightKg * (1 + a.reps / 30)
        )[0];
        if (best) {
          record.bestE1RM = {
            e1rmKg: entry.bestE1RM,
            weightKg: best.weightKg,
            reps: best.reps,
            date: entry.date,
          };
        }
      }
      if (entry.maxReps !== null && (!record.maxReps || entry.maxReps > record.maxReps.reps)) {
        const best = entry.sessionSets.find((set) => set.reps === entry.maxReps);
        record.maxReps = {
          reps: entry.maxReps,
          weightKg: best?.weightKg ?? null,
          date: entry.date,
        };
      }
      if (
        entry.volumeKg > 0 &&
        (!record.bestSessionVolume || entry.volumeKg > record.bestSessionVolume.volumeKg)
      ) {
        record.bestSessionVolume = { volumeKg: entry.volumeKg, date: entry.date };
      }
    }
    records.push(record);
  }
  return records;
}
