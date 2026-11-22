import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bucketSessions,
  exerciseHistory,
  muscleGroupBreakdown,
  personalRecords,
  rankExercises,
  summarizeSessions,
  type LoadedExercise,
  type LoadedSession,
} from "../src/mcp/aggregations.js";
import { computeSetMetrics, computeTargetMetrics } from "../src/mcp/metrics.js";
import { resolvePeriod } from "../src/mcp/period.js";

const TZ = "Europe/Paris";
const options = { defaultPeriod: "this_month" as const, defaultTimezone: TZ };

function set(
  setNumber: number,
  reps: number | null,
  weight: number | null,
  targetReps = 12,
  targetWeight: number | null = 100
) {
  return { setNumber, targetReps, targetWeight, actualReps: reps, actualWeight: weight };
}

function exercise(
  exerciseId: string,
  name: string,
  sets: ReturnType<typeof set>[],
  extra: Partial<LoadedExercise> = {}
): LoadedExercise {
  return {
    id: `se-${exerciseId}`,
    exerciseId,
    name,
    muscleGroups: ["pectoraux"],
    status: "completed",
    position: 1,
    sets,
    ...extra,
  };
}

function session(
  id: string,
  startedAt: string,
  exercises: LoadedExercise[],
  extra: Partial<LoadedSession> = {}
): LoadedSession {
  const start = new Date(startedAt);
  return {
    id,
    type: "planned",
    status: "completed",
    startedAt: start,
    completedAt: new Date(start.getTime() + 60 * 60_000),
    workoutId: "w1",
    workoutName: "Push",
    notes: null,
    exercises,
    ...extra,
  };
}

describe("computeSetMetrics", () => {
  it("uses actual results only, never targets", () => {
    const metrics = computeSetMetrics([
      set(1, 8, 50, 12, 100),
      set(2, 15, 40, 10, 100),
      set(3, null, null),
    ]);
    assert.equal(metrics.sets, 2);
    assert.equal(metrics.volumeKg, 1000);
    assert.equal(metrics.bestE1RM, 63.3);
    assert.equal(metrics.maxWeightKg, 50);
    assert.equal(metrics.repsAtMaxWeight, 8);
  });

  it("keeps bodyweight reps visible and out of the volume", () => {
    const metrics = computeSetMetrics([set(1, 12, null, 10, null), set(2, 10, 0, 10, null)]);
    assert.equal(metrics.sets, 2);
    assert.equal(metrics.reps, 22);
    assert.equal(metrics.volumeKg, 0);
    assert.equal(metrics.bodyweightSets, 2);
    assert.equal(metrics.maxWeightKg, null);
    assert.equal(metrics.maxReps, 12);
  });

  it("keeps a recorded 0-rep set distinct from a missing result", () => {
    const metrics = computeSetMetrics([set(1, 0, 60), set(2, null, null)]);
    assert.equal(metrics.sets, 1);
    assert.equal(metrics.reps, 0);
    assert.equal(metrics.bestE1RM, null);
  });
});

describe("computeTargetMetrics", () => {
  it("reports planned sets, met targets and volume against the target", () => {
    const target = computeTargetMetrics([
      set(1, 8, 50, 12, 100),
      set(2, 15, 40, 10, 100),
      set(3, null, null),
    ]);
    assert.equal(target.sets, 3);
    assert.equal(target.reps, 34);
    assert.equal(target.volumeKg, 3400);
    assert.equal(target.maxWeightKg, 100);
    assert.equal(target.setsMetTarget, 0);
    assert.equal(target.volumePercentOfTarget, 29.4);
  });

  it("counts a set as met only when reps and load reach the target", () => {
    assert.equal(computeTargetMetrics([set(1, 12, 100, 12, 100)]).setsMetTarget, 1);
    assert.equal(computeTargetMetrics([set(1, 12, 95, 12, 100)]).setsMetTarget, 0);
    assert.equal(computeTargetMetrics([set(1, 14, 105, 12, 100)]).setsMetTarget, 1);
  });

  it("compares bodyweight sets on repetitions only and has no volume target", () => {
    const target = computeTargetMetrics([set(1, 10, null, 10, null), set(2, 8, null, 10, null)]);
    assert.equal(target.setsMetTarget, 1);
    assert.equal(target.volumeKg, 0);
    assert.equal(target.maxWeightKg, null);
    assert.equal(target.volumePercentOfTarget, null);
  });
});

describe("summarizeSessions", () => {
  const bench = (reps: number, weight: number) =>
    exercise("bench", "Développé couché", [set(1, reps, weight)]);
  const sessions = [
    session("a", "2026-10-02T17:00:00Z", [bench(10, 60)]),
    session(
      "b",
      "2026-10-09T17:00:00Z",
      [bench(8, 70), exercise("skip", "Squat", [set(1, 5, 100)], { status: "skipped" })],
      { type: "ad_hoc", workoutId: null, workoutName: null }
    ),
    session("c", "2026-10-10T17:00:00Z", [bench(8, 70)], {
      status: "abandoned",
      completedAt: null,
    }),
    session("d", "2026-10-12T17:00:00Z", [bench(8, 70)], {
      status: "in_progress",
      completedAt: null,
    }),
  ];
  const period = resolvePeriod({ from: "2026-10-01", to: "2026-10-31" }, options);

  it("counts completed sessions only and excludes skipped exercises", () => {
    const summary = summarizeSessions(sessions, period);
    assert.equal(summary.sessions.completed, 2);
    assert.equal(summary.sessions.planned, 1);
    assert.equal(summary.sessions.adHoc, 1);
    assert.equal(summary.sessions.abandoned, 1);
    assert.equal(summary.sessions.inProgress, 1);
    assert.equal(summary.sessions.activeDays, 2);
    assert.equal(summary.totals.sets, 2);
    assert.equal(summary.totals.volumeKg, 1160);
    assert.equal(summary.duration.averageMinutes, 60);
    assert.equal(summary.sessions.perWeekAverage, 0.5);
  });

  it("reports targets of the performed exercises next to the results", () => {
    const summary = summarizeSessions(sessions, period);
    assert.equal(summary.targets.plannedSets, 2);
    assert.equal(summary.targets.setsMetTarget, 0);
    assert.equal(summary.targets.targetVolumeKg, 2400);
    assert.equal(summary.targets.volumePercentOfTarget, 48.3);
  });

  it("returns real zeros and explicit nulls for empty periods", () => {
    const summary = summarizeSessions([], period);
    assert.equal(summary.sessions.completed, 0);
    assert.equal(summary.duration.averageMinutes, null);
  });

  it("ignores implausible durations in aggregates but reports them", () => {
    const long = session("x", "2026-10-03T08:00:00Z", [bench(10, 60)], {
      completedAt: new Date("2026-10-05T08:00:00Z"),
    });
    const summary = summarizeSessions([long], period);
    assert.equal(summary.duration.samples, 0);
    assert.equal(summary.duration.ignoredOverLimit, 1);
  });

  it("buckets by local day, including a session after local midnight", () => {
    const late = session("late", "2026-10-31T23:30:00Z", [bench(10, 60)]);
    const buckets = bucketSessions(
      [late],
      resolvePeriod({ from: "2026-10-30", to: "2026-11-02" }, options),
      "day"
    );
    assert.deepEqual(
      buckets.map((bucket) => [bucket.from, bucket.sessions]),
      [
        ["2026-10-30", 0],
        ["2026-10-31", 0],
        ["2026-11-01", 1],
        ["2026-11-02", 0],
      ]
    );
  });
});

describe("exercise analytics", () => {
  const pullups = (reps: number[]) =>
    exercise(
      "pullup",
      "Tractions",
      reps.map((r, i) => set(i + 1, r, null, 8, null)),
      { muscleGroups: ["dos", "biceps"] }
    );
  const bench = (sets: Array<[number, number]>) =>
    exercise(
      "bench",
      "Développé couché",
      sets.map(([r, w], i) => set(i + 1, r, w))
    );
  const sessions = [
    session("1", "2026-09-01T17:00:00Z", [
      bench([
        [10, 60],
        [8, 65],
      ]),
      pullups([6, 5]),
    ]),
    session("2", "2026-09-08T17:00:00Z", [bench([[8, 70]])]),
    session("3", "2026-09-15T17:00:00Z", [bench([[5, 80]]), pullups([8])]),
  ];

  it("builds chronological history with progression inputs", () => {
    const history = exerciseHistory(sessions, "bench", TZ);
    assert.deepEqual(
      history.map((entry) => entry.date),
      ["2026-09-01", "2026-09-08", "2026-09-15"]
    );
    assert.equal(history[2]!.maxWeightKg, 80);
  });

  it("exposes the target of each set, including planned sets without result", () => {
    const planned = [
      session("t1", "2026-09-20T17:00:00Z", [
        exercise("bench", "Développé couché", [set(1, 10, 60, 10, 60), set(2, null, null, 10, 60)]),
      ]),
    ];
    const [entry] = exerciseHistory(planned, "bench", TZ);
    assert.equal(entry!.target.sets, 2);
    assert.equal(entry!.target.setsMetTarget, 1);
    assert.equal(entry!.sets, 1);
    assert.deepEqual(entry!.sessionSets[1], {
      setNumber: 2,
      reps: null,
      weightKg: null,
      targetReps: 10,
      targetWeightKg: 60,
    });
  });

  it("ranks by the requested metric with a stable tie-break", () => {
    const bySessions = rankExercises(sessions, "sessions", TZ);
    assert.deepEqual(
      bySessions.map((entry) => [entry.name, entry.sessions]),
      [
        ["Développé couché", 3],
        ["Tractions", 2],
      ]
    );
    const byReps = rankExercises(sessions, "reps", TZ);
    assert.equal(byReps[0]!.name, "Développé couché");
  });

  it("computes personal records, including bodyweight max reps", () => {
    const records = personalRecords(sessions, TZ);
    const bench = records.find((record) => record.exerciseId === "bench")!;
    assert.deepEqual(bench.maxWeight, { weightKg: 80, reps: 5, date: "2026-09-15" });
    assert.equal(bench.bestE1RM?.date, "2026-09-15");
    const pull = records.find((record) => record.exerciseId === "pullup")!;
    assert.equal(pull.maxWeight, null);
    assert.deepEqual(pull.maxReps, { reps: 8, weightKg: null, date: "2026-09-15" });
  });

  it("attributes exercises to each of their muscle groups", () => {
    const { groups } = muscleGroupBreakdown(sessions);
    assert.deepEqual(groups.map((group) => group.muscleGroup).sort(), [
      "biceps",
      "dos",
      "pectoraux",
    ]);
    assert.equal(groups.find((group) => group.muscleGroup === "pectoraux")!.sessions, 3);
  });
});
