import { prisma } from "../lib/prisma.js";
import type { ResolvedPeriod } from "./period.js";

export const MEASUREMENT_FIELDS = [
  "weight",
  "neck",
  "shoulders",
  "chest",
  "bicepsLeft",
  "bicepsRight",
  "forearmLeft",
  "forearmRight",
  "wristLeft",
  "wristRight",
  "waist",
  "hips",
  "thighLeft",
  "thighRight",
  "calfLeft",
  "calfRight",
  "ankleLeft",
  "ankleRight",
] as const;

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

export function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function loadMeasurements(userId: string, period: ResolvedPeriod) {
  return prisma.measurement.findMany({
    where: { userId, date: { gte: period.dateStart, lt: period.dateEnd } },
    orderBy: { date: "asc" },
    select: {
      date: true,
      notes: true,
      weight: true,
      neck: true,
      shoulders: true,
      chest: true,
      bicepsLeft: true,
      bicepsRight: true,
      forearmLeft: true,
      forearmRight: true,
      wristLeft: true,
      wristRight: true,
      waist: true,
      hips: true,
      thighLeft: true,
      thighRight: true,
      calfLeft: true,
      calfRight: true,
      ankleLeft: true,
      ankleRight: true,
    },
  });
}

export async function loadTracking(userId: string, period: ResolvedPeriod) {
  return prisma.trackableItem.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      trackingType: true,
      unit: true,
      isSystem: true,
      isActive: true,
      goals: {
        where: { endDate: null },
        orderBy: { startDate: "desc" },
        take: 1,
        select: { targetValue: true, frequency: true },
      },
      entries: {
        where: { date: { gte: period.dateStart, lt: period.dateEnd } },
        orderBy: { date: "asc" },
        select: { date: true, value: true, source: true },
      },
    },
  });
}

export async function loadWorkouts(userId: string) {
  const [workouts, usage] = await Promise.all([
    prisma.workout.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        items: {
          orderBy: { position: "asc" },
          select: {
            type: true,
            rounds: true,
            exercises: {
              orderBy: { position: "asc" },
              select: {
                exercise: { select: { id: true, name: true } },
                sets: { select: { targetReps: true, targetWeight: true } },
              },
            },
          },
        },
      },
    }),
    prisma.workoutSession.groupBy({
      by: ["workoutId"],
      where: { userId, status: "completed", workoutId: { not: null } },
      _count: { _all: true },
      _max: { startedAt: true },
    }),
  ]);
  return { workouts, usage };
}

export async function loadProfile(userId: string) {
  const [user, latestWeight] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, birthDate: true, height: true, goalDescription: true, createdAt: true },
    }),
    prisma.measurement.findFirst({
      where: { userId, weight: { not: null } },
      orderBy: { date: "desc" },
      select: { date: true, weight: true },
    }),
  ]);
  return { user, latestWeight };
}
