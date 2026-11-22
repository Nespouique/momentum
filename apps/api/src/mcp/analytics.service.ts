import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import type { LoadedSession, SessionStatusValue, SessionTypeValue } from "./aggregations.js";
import { SKIPPED_EXERCISE_STATUSES, normalizeText } from "./metrics.js";
import { McpToolError } from "./period.js";

export const MAX_LOADED_SESSIONS = 5000;

export interface SessionFilter {
  startUtc?: Date | undefined;
  endUtc?: Date | undefined;
  statuses?: SessionStatusValue[] | undefined;
  type?: SessionTypeValue | undefined;
  workoutId?: string | undefined;
  exerciseId?: string | undefined;
}

const sessionSelect = {
  id: true,
  type: true,
  status: true,
  startedAt: true,
  completedAt: true,
  workoutId: true,
  notes: true,
  workout: { select: { name: true } },
  exercises: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      exerciseId: true,
      status: true,
      position: true,
      exercise: { select: { name: true, muscleGroups: true } },
      sets: {
        orderBy: { setNumber: "asc" },
        select: {
          setNumber: true,
          targetReps: true,
          targetWeight: true,
          actualReps: true,
          actualWeight: true,
          rpe: true,
        },
      },
    },
  },
} satisfies Prisma.WorkoutSessionSelect;

type SessionRow = Prisma.WorkoutSessionGetPayload<{ select: typeof sessionSelect }>;

function toLoadedSession(row: SessionRow): LoadedSession {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    workoutId: row.workoutId,
    workoutName: row.workout?.name ?? null,
    notes: row.notes,
    exercises: row.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.exercise.name,
      muscleGroups: exercise.exercise.muscleGroups,
      status: exercise.status,
      position: exercise.position,
      sets: exercise.sets,
    })),
  };
}

// Ownership always comes from the authenticated userId, never from tool arguments.
export function buildSessionWhere(
  userId: string,
  filter: SessionFilter
): Prisma.WorkoutSessionWhereInput {
  const where: Prisma.WorkoutSessionWhereInput = { userId };
  if (filter.startUtc || filter.endUtc) {
    where.startedAt = {
      ...(filter.startUtc ? { gte: filter.startUtc } : {}),
      ...(filter.endUtc ? { lt: filter.endUtc } : {}),
    };
  }
  if (filter.statuses) where.status = { in: filter.statuses };
  if (filter.type) where.type = filter.type;
  if (filter.workoutId) where.workoutId = filter.workoutId;
  if (filter.exerciseId) {
    where.exercises = {
      some: {
        exerciseId: filter.exerciseId,
        status: { notIn: [...SKIPPED_EXERCISE_STATUSES] },
      },
    };
  }
  return where;
}

export async function loadSessions(
  userId: string,
  filter: SessionFilter
): Promise<{ sessions: LoadedSession[]; truncated: boolean }> {
  const rows = await prisma.workoutSession.findMany({
    where: buildSessionWhere(userId, filter),
    orderBy: { startedAt: "asc" },
    take: MAX_LOADED_SESSIONS + 1,
    select: sessionSelect,
  });
  const truncated = rows.length > MAX_LOADED_SESSIONS;
  return { sessions: rows.slice(0, MAX_LOADED_SESSIONS).map(toLoadedSession), truncated };
}

export async function loadSessionPage(
  userId: string,
  filter: SessionFilter,
  options: { order: "asc" | "desc"; skip: number; take: number }
): Promise<{ sessions: LoadedSession[]; total: number }> {
  const where = buildSessionWhere(userId, filter);
  const [rows, total] = await Promise.all([
    prisma.workoutSession.findMany({
      where,
      orderBy: { startedAt: options.order },
      skip: options.skip,
      take: options.take,
      select: sessionSelect,
    }),
    prisma.workoutSession.count({ where }),
  ]);
  return { sessions: rows.map(toLoadedSession), total };
}

export async function loadSession(
  userId: string,
  sessionId: string
): Promise<LoadedSession | null> {
  const row = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: sessionSelect,
  });
  return row ? toLoadedSession(row) : null;
}

export async function firstSessionStart(userId: string): Promise<Date | null> {
  const first = await prisma.workoutSession.findFirst({
    where: { userId, status: "completed" },
    orderBy: { startedAt: "asc" },
    select: { startedAt: true },
  });
  return first?.startedAt ?? null;
}

export interface ExerciseRef {
  id: string;
  name: string;
  muscleGroups: string[];
}

export type ExerciseResolution =
  | { status: "found"; exercise: ExerciseRef }
  | { status: "ambiguous"; candidates: ExerciseRef[] }
  | { status: "not_found"; suggestions: ExerciseRef[] };

export async function loadExerciseLibrary(): Promise<ExerciseRef[]> {
  return prisma.exercise.findMany({
    select: { id: true, name: true, muscleGroups: true },
    orderBy: { name: "asc" },
  });
}

export function matchExercises(
  library: ExerciseRef[],
  query: { exerciseId?: string | undefined; name?: string | undefined }
): ExerciseResolution {
  if (query.exerciseId) {
    const found = library.find((exercise) => exercise.id === query.exerciseId);
    return found ? { status: "found", exercise: found } : { status: "not_found", suggestions: [] };
  }

  const wanted = normalizeText(query.name ?? "");
  if (wanted === "") throw new McpToolError('Fournis "exerciseId" ou "exercise" (nom).');

  const exact = library.filter((exercise) => normalizeText(exercise.name) === wanted);
  if (exact.length === 1) return { status: "found", exercise: exact[0]! };
  if (exact.length > 1) return { status: "ambiguous", candidates: exact.slice(0, 10) };

  const tokens = wanted.split(" ");
  const partial = library.filter((exercise) => {
    const name = normalizeText(exercise.name);
    return tokens.every((token) => name.includes(token));
  });
  if (partial.length === 1) return { status: "found", exercise: partial[0]! };
  if (partial.length > 1) return { status: "ambiguous", candidates: partial.slice(0, 10) };

  const suggestions = library
    .map((exercise) => {
      const name = normalizeText(exercise.name);
      return { exercise, score: tokens.filter((token) => name.includes(token)).length };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.exercise);
  return { status: "not_found", suggestions };
}
