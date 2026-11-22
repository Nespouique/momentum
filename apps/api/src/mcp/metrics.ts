export const SKIPPED_EXERCISE_STATUSES = ["skipped", "substituted"] as const;
export const MAX_PLAUSIBLE_DURATION_MINUTES = 360;

export interface SetInput {
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  rpe?: number | null;
}

export interface SetMetrics {
  /** Sets with a recorded result (actualReps not null). Targets are never used. */
  sets: number;
  reps: number;
  /** Sum of weight x reps over sets with an external load greater than 0. */
  volumeKg: number;
  /** Sets with an external load greater than 0. */
  weightedSets: number;
  /** Sets with no external load recorded (bodyweight). Their reps are in `reps`. */
  bodyweightSets: number;
  maxWeightKg: number | null;
  repsAtMaxWeight: number | null;
  /** Highest rep count in a single set, regardless of load. */
  maxReps: number | null;
  /** Best estimated 1RM (Epley) among weighted sets. */
  bestE1RM: number | null;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export function emptySetMetrics(): SetMetrics {
  return {
    sets: 0,
    reps: 0,
    volumeKg: 0,
    weightedSets: 0,
    bodyweightSets: 0,
    maxWeightKg: null,
    repsAtMaxWeight: null,
    maxReps: null,
    bestE1RM: null,
  };
}

export function computeSetMetrics(
  sets: Array<Pick<SetInput, "actualReps" | "actualWeight">>
): SetMetrics {
  const metrics = emptySetMetrics();
  let volume = 0;

  for (const set of sets) {
    if (set.actualReps === null || set.actualReps === undefined) continue;
    const reps = set.actualReps;
    const weight = set.actualWeight ?? 0;

    metrics.sets += 1;
    metrics.reps += reps;
    if (metrics.maxReps === null || reps > metrics.maxReps) metrics.maxReps = reps;

    if (weight > 0) {
      metrics.weightedSets += 1;
      volume += weight * reps;
      const e1rm = epley1RM(weight, reps);
      if (reps > 0 && (metrics.bestE1RM === null || e1rm > metrics.bestE1RM)) {
        metrics.bestE1RM = e1rm;
      }
      if (
        metrics.maxWeightKg === null ||
        weight > metrics.maxWeightKg ||
        (weight === metrics.maxWeightKg && reps > (metrics.repsAtMaxWeight ?? 0))
      ) {
        metrics.maxWeightKg = weight;
        metrics.repsAtMaxWeight = reps;
      }
    } else {
      metrics.bodyweightSets += 1;
    }
  }

  metrics.volumeKg = round1(volume);
  metrics.bestE1RM = metrics.bestE1RM === null ? null : round1(metrics.bestE1RM);
  return metrics;
}

export interface TargetMetrics {
  /** Planned sets, including sets that were never performed. */
  sets: number;
  reps: number;
  /** Sum of target weight x target reps over sets with a target load greater than 0. */
  volumeKg: number;
  maxWeightKg: number | null;
  /** Performed sets with reps >= target reps and load >= target load (when a target load exists). */
  setsMetTarget: number;
  /** Actual volume as a percentage of the target volume (null without a target load). */
  volumePercentOfTarget: number | null;
}

export function computeTargetMetrics(
  sets: Array<Pick<SetInput, "targetReps" | "targetWeight" | "actualReps" | "actualWeight">>
): TargetMetrics {
  let reps = 0;
  let volume = 0;
  let maxWeight: number | null = null;
  let met = 0;

  for (const set of sets) {
    reps += set.targetReps;
    const targetWeight = set.targetWeight ?? 0;
    if (targetWeight > 0) {
      volume += targetWeight * set.targetReps;
      if (maxWeight === null || targetWeight > maxWeight) maxWeight = targetWeight;
    }
    if (set.actualReps !== null && set.actualReps !== undefined) {
      const repsOk = set.actualReps >= set.targetReps;
      const weightOk = targetWeight <= 0 || (set.actualWeight ?? 0) >= targetWeight;
      if (repsOk && weightOk) met += 1;
    }
  }

  const actualVolume = computeSetMetrics(sets).volumeKg;
  return {
    sets: sets.length,
    reps,
    volumeKg: round1(volume),
    maxWeightKg: maxWeight,
    setsMetTarget: met,
    volumePercentOfTarget: volume > 0 ? round1((actualVolume / volume) * 100) : null,
  };
}

export function addSetMetrics(
  total: Pick<SetMetrics, "sets" | "reps" | "volumeKg">,
  metrics: Pick<SetMetrics, "sets" | "reps" | "volumeKg">
): void {
  total.sets += metrics.sets;
  total.reps += metrics.reps;
  total.volumeKg = round1(total.volumeKg + metrics.volumeKg);
}

export function durationMinutes(startedAt: Date, completedAt: Date | null): number | null {
  if (!completedAt) return null;
  const minutes = (completedAt.getTime() - startedAt.getTime()) / 60_000;
  return minutes >= 0 ? round1(minutes) : null;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return round1(((current - previous) / previous) * 100);
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
