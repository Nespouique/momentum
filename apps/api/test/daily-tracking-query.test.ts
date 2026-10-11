import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dailyTrackingQuerySchema } from "../src/schemas/tracking.schema.js";

const validQuery = {
  date: "2026-10-10",
  dayStart: "2026-10-10T07:00:00.000Z",
  nextDayStart: "2026-10-11T07:00:00.000Z",
  weekStart: "2026-10-05T07:00:00.000Z",
  monthStart: "2026-10-01T07:00:00.000Z",
  weekDateStart: "2026-10-05",
  monthDateStart: "2026-10-01",
};

describe("selected-day tracking query contract", () => {
  it("accepts browser-local instants and selected calendar day together", () => {
    assert.deepEqual(dailyTrackingQuerySchema.parse(validQuery), validQuery);
  });

  it("preserves the legacy no-parameter request while rejecting incomplete bounds", () => {
    assert.deepEqual(dailyTrackingQuerySchema.parse({}), {});
    assert.equal(dailyTrackingQuerySchema.safeParse({ date: "2026-10-10" }).success, false);
    assert.equal(
      dailyTrackingQuerySchema.safeParse({ date: "2026-10-10", dayStart: validQuery.dayStart })
        .success,
      false
    );
  });

  it("rejects invalid dates and intervals that are not a 23/24/25-hour local day", () => {
    assert.equal(
      dailyTrackingQuerySchema.safeParse({ ...validQuery, date: "2026-02-30" }).success,
      false
    );
    assert.equal(
      dailyTrackingQuerySchema.safeParse({
        ...validQuery,
        nextDayStart: "2026-10-11T06:59:59.999Z",
      }).success,
      false
    );
  });

  it("accepts DST-shortened and DST-lengthened days", () => {
    const spring = {
      ...validQuery,
      date: "2026-03-08",
      dayStart: "2026-03-08T08:00:00.000Z",
      nextDayStart: "2026-03-09T07:00:00.000Z",
      weekStart: "2026-03-02T08:00:00.000Z",
      monthStart: "2026-03-01T08:00:00.000Z",
      weekDateStart: "2026-03-02",
      monthDateStart: "2026-03-01",
    };
    const fall = {
      ...spring,
      date: "2026-11-01",
      dayStart: "2026-11-01T07:00:00.000Z",
      nextDayStart: "2026-11-02T08:00:00.000Z",
      weekStart: "2026-10-26T07:00:00.000Z",
      monthStart: "2026-11-01T07:00:00.000Z",
      weekDateStart: "2026-10-26",
      monthDateStart: "2026-11-01",
    };
    assert.equal(dailyTrackingQuerySchema.safeParse(spring).success, true);
    assert.equal(dailyTrackingQuerySchema.safeParse(fall).success, true);
  });

  it("accepts Lord Howe half-hour DST changes and rejects day/date mismatches", () => {
    const springHalfHour = {
      ...validQuery,
      date: "2026-10-04",
      dayStart: "2026-10-03T13:30:00.000Z",
      nextDayStart: "2026-10-04T13:00:00.000Z",
      weekStart: "2026-09-28T13:30:00.000Z",
      monthStart: "2026-09-30T13:30:00.000Z",
      weekDateStart: "2026-09-28",
      monthDateStart: "2026-10-01",
    };
    assert.equal(dailyTrackingQuerySchema.safeParse(springHalfHour).success, true);

    assert.equal(
      dailyTrackingQuerySchema.safeParse({
        ...validQuery,
        date: "2026-10-10",
        dayStart: "2025-01-01T00:00:00.000Z",
        nextDayStart: "2025-01-02T00:00:00.000Z",
      }).success,
      false
    );
    assert.equal(
      dailyTrackingQuerySchema.safeParse({
        ...validQuery,
        weekStart: "2020-01-06T00:00:00.000Z",
      }).success,
      false
    );
    assert.equal(
      dailyTrackingQuerySchema.safeParse({
        ...validQuery,
        weekDateStart: "2020-01-06",
        weekStart: "2020-01-06T00:00:00.000Z",
      }).success,
      false
    );
  });

  it("rejects duplicate and unrelated query keys", () => {
    assert.deepEqual(
      dailyTrackingQuerySchema.parse({ ...validQuery, extra: "ignored" }),
      validQuery
    );
    assert.equal(
      dailyTrackingQuerySchema.safeParse({ ...validQuery, date: [validQuery.date] }).success,
      false
    );
  });
});
