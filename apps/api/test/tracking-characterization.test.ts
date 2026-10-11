import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEntrySchema } from "../src/schemas/tracking.schema.js";

describe("existing daily tracking contracts", () => {
  it("accepts date-only keys and does not normalize them through UTC", () => {
    const input = {
      trackableId: "00000000-0000-4000-8000-000000000001",
      date: "2026-10-10",
      value: 1,
    };

    assert.deepEqual(createEntrySchema.parse(input), input);
    assert.equal(
      createEntrySchema.safeParse({ ...input, date: "2026-10-11T00:00:00.000Z" }).success,
      false
    );
  });

  it("keeps the existing numeric validation contract", () => {
    const input = {
      trackableId: "00000000-0000-4000-8000-000000000001",
      date: "2026-10-10",
      value: -1,
    };

    // The current API schema accepts any number; this story must not silently redefine validation.
    assert.equal(createEntrySchema.safeParse(input).success, true);
  });
});
