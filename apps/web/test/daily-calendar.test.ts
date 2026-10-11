import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCalendarDays,
  getDailyDateContext,
  getLocalDateKey,
  parseLocalDateKey,
} from "../src/lib/daily-calendar";

describe("browser-local daily calendar", () => {
  it("increments across month, year, leap-day, and daylight-saving boundaries", () => {
    assert.equal(addCalendarDays("2024-02-28", 1), "2024-02-29");
    assert.equal(addCalendarDays("2024-02-29", 1), "2024-03-01");
    assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");

    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      assert.equal(addCalendarDays("2026-03-08", 1), "2026-03-09");
      assert.equal(addCalendarDays("2026-11-01", 1), "2026-11-02");
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });

  it("uses browser calendar day and local-midnight boundaries rather than UTC truncation", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      const now = new Date("2026-10-10T22:30:00.000Z");
      assert.equal(getLocalDateKey(now), "2026-10-10");
      const context = getDailyDateContext("2026-10-10");
      assert.equal(context.dayStart, "2026-10-10T07:00:00.000Z");
      assert.equal(context.nextDayStart, "2026-10-11T07:00:00.000Z");
      assert.equal(context.weekStart, "2026-10-05T07:00:00.000Z");
      assert.equal(context.monthStart, "2026-10-01T07:00:00.000Z");
      assert.equal(context.weekDateStart, "2026-10-05");
      assert.equal(context.monthDateStart, "2026-10-01");
      assert.equal(getLocalDateKey(parseLocalDateKey("2026-10-10")), "2026-10-10");
      assert.throws(() => getDailyDateContext("2026-02-30"), RangeError);
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });

  it("uses 23- and 25-hour local days around daylight-saving transitions", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      const spring = getDailyDateContext("2026-03-08");
      const fall = getDailyDateContext("2026-11-01");
      assert.equal(
        Date.parse(spring.nextDayStart) - Date.parse(spring.dayStart),
        23 * 60 * 60 * 1000
      );
      assert.equal(Date.parse(fall.nextDayStart) - Date.parse(fall.dayStart), 25 * 60 * 60 * 1000);
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });
});
