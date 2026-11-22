import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  McpToolError,
  buildBuckets,
  localDateKey,
  localMidnightToUtc,
  previousPeriod,
  resolvePeriod,
} from "../src/mcp/period.js";

const options = { defaultPeriod: "this_month" as const, defaultTimezone: "Europe/Paris" };
const at = (iso: string) => new Date(iso);

describe("resolvePeriod", () => {
  it("resolves this_month in the local calendar with half-open UTC bounds", () => {
    const period = resolvePeriod(
      { period: "this_month" },
      { ...options, now: at("2026-10-15T10:00:00Z") }
    );
    assert.equal(period.from, "2026-10-01");
    assert.equal(period.to, "2026-10-15");
    assert.equal(period.days, 15);
    assert.equal(period.startUtc.toISOString(), "2026-09-30T22:00:00.000Z");
    assert.equal(period.endUtc.toISOString(), "2026-10-15T22:00:00.000Z");
  });

  it("uses the local day, not the UTC day, around midnight", () => {
    const period = resolvePeriod(
      { period: "today" },
      { ...options, now: at("2026-10-31T23:30:00Z") }
    );
    assert.equal(period.from, "2026-11-01");
  });

  it("handles the DST change: the local day lasts 25 hours on 2026-10-25", () => {
    const period = resolvePeriod({ from: "2026-10-25", to: "2026-10-25" }, options);
    assert.equal((period.endUtc.getTime() - period.startUtc.getTime()) / 3_600_000, 25);
    const spring = resolvePeriod({ from: "2026-03-29", to: "2026-03-29" }, options);
    assert.equal((spring.endUtc.getTime() - spring.startUtc.getTime()) / 3_600_000, 23);
  });

  it("starts weeks on Monday", () => {
    const period = resolvePeriod(
      { period: "this_week" },
      { ...options, now: at("2026-10-22T10:00:00Z") }
    );
    assert.equal(period.from, "2026-10-19");
    const last = resolvePeriod(
      { period: "last_week" },
      { ...options, now: at("2026-10-22T10:00:00Z") }
    );
    assert.deepEqual([last.from, last.to], ["2026-10-12", "2026-10-18"]);
  });

  it("resolves last_month across a year boundary", () => {
    const period = resolvePeriod(
      { period: "last_month" },
      { ...options, now: at("2027-01-10T10:00:00Z") }
    );
    assert.deepEqual([period.from, period.to], ["2026-12-01", "2026-12-31"]);
  });

  it("keeps date-only bounds at UTC midnight", () => {
    const period = resolvePeriod({ from: "2026-02-01", to: "2026-02-28" }, options);
    assert.equal(period.dateStart.toISOString(), "2026-02-01T00:00:00.000Z");
    assert.equal(period.dateEnd.toISOString(), "2026-03-01T00:00:00.000Z");
  });

  it("rejects invalid input with actionable errors", () => {
    assert.throws(() => resolvePeriod({ from: "2026-02-31" }, options), McpToolError);
    assert.throws(() => resolvePeriod({ to: "2026-02-03" }, options), McpToolError);
    assert.throws(
      () => resolvePeriod({ from: "2026-03-02", to: "2026-03-01" }, options),
      McpToolError
    );
    assert.throws(() => resolvePeriod({ timezone: "Mars/Olympus" }, options), McpToolError);
    assert.throws(
      () => resolvePeriod({ from: "2000-01-01", to: "2026-01-01" }, options),
      McpToolError
    );
  });
});

describe("previousPeriod", () => {
  it("compares month-to-date with the same elapsed days of the previous month", () => {
    const current = resolvePeriod(
      { period: "this_month" },
      { ...options, now: at("2026-10-15T10:00:00Z") }
    );
    const previous = previousPeriod(current);
    assert.deepEqual([previous.from, previous.to], ["2026-09-01", "2026-09-15"]);
  });

  it("clamps to the previous month length", () => {
    const current = resolvePeriod(
      { period: "this_month" },
      { ...options, now: at("2026-03-31T10:00:00Z") }
    );
    const previous = previousPeriod(current);
    assert.deepEqual([previous.from, previous.to], ["2026-02-01", "2026-02-28"]);
  });

  it("uses the immediately preceding window of equal length for rolling periods", () => {
    const current = resolvePeriod(
      { period: "last_30_days" },
      { ...options, now: at("2026-10-31T10:00:00Z") }
    );
    const previous = previousPeriod(current);
    assert.equal(previous.days, 30);
    assert.equal(previous.to, "2026-10-01");
  });
});

describe("buckets and local dates", () => {
  it("builds Monday weeks clipped to the period and flags partial buckets", () => {
    const period = resolvePeriod({ from: "2026-10-14", to: "2026-10-27" }, options);
    const buckets = buildBuckets(period, "week");
    assert.deepEqual(
      buckets.map((bucket) => [bucket.from, bucket.to, bucket.partial]),
      [
        ["2026-10-14", "2026-10-18", true],
        ["2026-10-19", "2026-10-25", false],
        ["2026-10-26", "2026-10-27", true],
      ]
    );
  });

  it("builds calendar months", () => {
    const period = resolvePeriod({ from: "2026-01-15", to: "2026-03-10" }, options);
    assert.deepEqual(
      buildBuckets(period, "month").map((bucket) => [bucket.from, bucket.to]),
      [
        ["2026-01-15", "2026-01-31"],
        ["2026-02-01", "2026-02-28"],
        ["2026-03-01", "2026-03-10"],
      ]
    );
  });

  it("converts local midnight and local dates consistently", () => {
    assert.equal(
      localMidnightToUtc({ y: 2026, m: 7, d: 1 }, "Europe/Paris").toISOString(),
      "2026-06-30T22:00:00.000Z"
    );
    assert.equal(localDateKey(at("2026-06-30T22:30:00Z"), "Europe/Paris"), "2026-07-01");
    assert.equal(localDateKey(at("2026-06-30T22:30:00Z"), "UTC"), "2026-06-30");
  });
});
