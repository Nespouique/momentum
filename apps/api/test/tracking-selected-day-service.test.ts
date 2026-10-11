import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { prisma } from "../src/lib/prisma.js";
import { getTodayTracking } from "../src/services/tracking.service.js";

const dateKeys = ["2026-10-05", "2026-10-10", "2026-10-11"];
const trackables = [
  { id: "weekly", frequency: "weekly", trackingType: "boolean" },
  { id: "monthly", frequency: "monthly", trackingType: "number" },
  { id: "daily", frequency: "daily", trackingType: "boolean" },
].map((item, index) => ({
  ...item,
  userId: "user-1",
  name: `Trackable ${index}`,
  icon: "circle",
  color: "#000000",
  unit: null,
  isSystem: false,
  isActive: true,
  sortOrder: index,
  goals: [{ id: `goal-${item.id}`, targetValue: 10, frequency: item.frequency }],
  entries: [],
}));

describe("getTodayTracking selected-day database behavior", () => {
  it("queries the selected DATE, period cutoff, and browser-local half-open session intervals", async () => {
    const calls: { type: string; args: unknown }[] = [];
    const entries = [
      { id: "w-5", trackableId: "weekly", date: new Date("2026-10-05T00:00:00Z"), value: 1 },
      { id: "w-10", trackableId: "weekly", date: new Date("2026-10-10T00:00:00Z"), value: 1 },
      { id: "w-11", trackableId: "weekly", date: new Date("2026-10-11T00:00:00Z"), value: 1 },
      { id: "m-5", trackableId: "monthly", date: new Date("2026-10-05T00:00:00Z"), value: 3 },
      { id: "m-10", trackableId: "monthly", date: new Date("2026-10-10T00:00:00Z"), value: 4 },
      { id: "m-11", trackableId: "monthly", date: new Date("2026-10-11T00:00:00Z"), value: 9 },
    ];
    const between = (date: Date, range: { gte?: Date; lte?: Date }) =>
      (!range.gte || date >= range.gte) && (!range.lte || date <= range.lte);
    const database = {
      trackableItem: {
        findMany: async (args: unknown) => {
          calls.push({ type: "trackables", args });
          const where = (args as { include: { entries: { where: { date: Date } } } }).include
            .entries.where;
          return trackables.map((trackable) => ({
            ...trackable,
            entries: entries.filter(
              (entry) =>
                entry.trackableId === trackable.id && entry.date.getTime() === where.date.getTime()
            ),
          }));
        },
      },
      dailyEntry: {
        findMany: async (args: unknown) => {
          calls.push({ type: "entries", args });
          const where = (
            args as { where: { trackableId: { in: string[] }; date: { gte: Date; lte: Date } } }
          ).where;
          return entries.filter(
            (entry) =>
              where.trackableId.in.includes(entry.trackableId) && between(entry.date, where.date)
          );
        },
      },
      workoutSession: {
        count: async (args: unknown) => {
          calls.push({ type: "sessions", args });
          const range = (args as { where: { completedAt: { gte: Date; lt: Date } } }).where
            .completedAt;
          const fixtures = [
            new Date("2026-10-10T06:59:59.999Z"),
            new Date("2026-10-10T07:00:00.000Z"),
            new Date("2026-10-11T06:59:59.999Z"),
            new Date("2026-10-11T07:00:00.000Z"),
          ];
          return fixtures.filter((instant) => instant >= range.gte && instant < range.lt).length;
        },
      },
    } as unknown as typeof prisma;

    const result = await getTodayTracking(
      "user-1",
      {
        date: "2026-10-10",
        dayStart: "2026-10-10T07:00:00.000Z",
        nextDayStart: "2026-10-11T07:00:00.000Z",
        weekStart: "2026-10-05T07:00:00.000Z",
        monthStart: "2026-10-01T07:00:00.000Z",
        weekDateStart: "2026-10-05",
        monthDateStart: "2026-10-01",
      },
      database
    );

    assert.equal(result.date, "2026-10-10");
    assert.deepEqual(
      result.trackables.map((item) => item.goalProgress?.current),
      [2, 7, undefined]
    );
    assert.equal(result.workoutSessions.today, 2);
    const sessionCalls = calls.filter((call) => call.type === "sessions");
    assert.equal(sessionCalls.length, 3);
    const dayRange = (sessionCalls[0]!.args as { where: { completedAt: { gte: Date; lt: Date } } })
      .where.completedAt;
    assert.equal(dayRange.gte.toISOString(), "2026-10-10T07:00:00.000Z");
    assert.equal(dayRange.lt.toISOString(), "2026-10-11T07:00:00.000Z");
    const periodRange = (
      sessionCalls[1]!.args as { where: { completedAt: { gte: Date; lt: Date } } }
    ).where.completedAt;
    assert.equal(periodRange.gte.toISOString(), "2026-10-05T07:00:00.000Z");
    assert.equal(periodRange.lt.toISOString(), "2026-10-11T07:00:00.000Z");
    assert.ok(!dateKeys.includes("2026-10-12"));
  });
});
