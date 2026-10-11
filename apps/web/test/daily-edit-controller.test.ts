import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTrackableValue,
  DailyEditLedger,
  DailySaveGate,
} from "../src/lib/daily-edit-controller";
import { DailyReadCoordinator } from "../src/lib/daily-read-coordinator";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("daily request and edit isolation", () => {
  it("rolls back the original value for one trackable and retains concurrent successful edits", () => {
    const ledger = new DailyEditLedger<{
      id: string;
      value: number;
      entry: number;
      completed: boolean;
    }>();
    const initialA = { id: "a", value: 1, entry: 1, completed: true };
    const initialB = { id: "b", value: 2, entry: 2, completed: false };
    ledger.begin("user:day", initialA);
    ledger.setOptimistic("user:day", { id: "a", value: 10, entry: 10, completed: true });
    ledger.begin("user:day", initialB);
    ledger.setOptimistic("user:day", { id: "b", value: 20, entry: 20, completed: true });
    ledger.commit("user:day", { id: "b", value: 20, entry: 20, completed: true });

    const aResult = ledger.finish("user:day", "a", true);
    assert.deepEqual(aResult.rollback, initialA);
    const bResult = ledger.finish("user:day", "b", false);
    assert.deepEqual(bResult.committed, { id: "b", value: 20, entry: 20, completed: true });
    assert.equal(bResult.finished, true);
  });

  it("refuses duplicate pending saves through the same gate API used by the home", () => {
    const gate = new DailySaveGate();
    assert.equal(gate.begin("user:day:a"), true);
    assert.equal(gate.begin("user:day:a"), false);
    assert.equal(gate.begin("user:day:b"), true);
  });

  it("ignores stale A-B-A reads and keeps each dated snapshot isolated", async () => {
    const pending = [deferred<string>(), deferred<string>(), deferred<string>()];
    let index = 0;
    const coordinator = new DailyReadCoordinator<string>();
    const firstA = coordinator.read("user:2026-10-10", () => pending[index++]!.promise);
    const b = coordinator.read("user:2026-10-11", () => pending[index++]!.promise);
    const secondA = coordinator.read("user:2026-10-10", () => pending[index++]!.promise);

    pending[0]!.resolve("old A");
    pending[1]!.resolve("B");
    pending[2]!.resolve("new A");
    assert.equal(await firstA, null);
    assert.equal(await b, null);
    assert.equal(await secondA, "new A");
    assert.equal(coordinator.isCurrent("user:2026-10-10"), true);
    assert.equal(coordinator.isCurrent("user:2026-10-11"), false);
  });

  it("retains a snapshot and save date across navigation while rejecting duplicate submits", async () => {
    const coordinator = new DailyReadCoordinator<{ date: string }>();
    await coordinator.read("user:2026-10-10", async () => ({ date: "2026-10-10" }));
    const original = coordinator.snapshot("user:2026-10-10");
    const gate = new DailySaveGate();
    assert.equal(gate.begin("first"), true);
    assert.equal(gate.begin("first"), false);
    await coordinator.read("user:2026-10-11", async () => ({ date: "2026-10-11" }));
    assert.equal(coordinator.snapshot("user:2026-10-10"), original);
    assert.equal(coordinator.isCurrent("user:2026-10-10"), false);
    gate.finish("first");
    assert.equal(gate.begin("first"), true);
  });

  it("does not replace a persisted original with an optimistic overwrite", () => {
    const ledger = new DailyEditLedger<{
      id: string;
      value: number;
      entry: number;
      completed: boolean;
    }>();
    ledger.begin("owner", { id: "habit", value: 4, entry: 4, completed: false });
    ledger.setOptimistic("owner", { id: "habit", value: 99, entry: 99, completed: true });
    const result = ledger.finish("owner", "habit", true);
    assert.deepEqual(result.rollback, { id: "habit", value: 4, entry: 4, completed: false });
  });

  it("does not reapply a failed optimistic value when a concurrent edit remains pending", () => {
    const ledger = new DailyEditLedger<{ id: string; entry: number | null; completed: boolean }>();
    ledger.begin("owner", { id: "a", entry: 1, completed: true });
    ledger.setOptimistic("owner", { id: "a", entry: 2, completed: true });
    ledger.begin("owner", { id: "b", entry: 3, completed: false });
    ledger.setOptimistic("owner", { id: "b", entry: 4, completed: true });

    assert.deepEqual(ledger.finish("owner", "a", true).rollback, {
      id: "a",
      entry: 1,
      completed: true,
    });
    const freshRead = [
      { id: "a", entry: null, completed: false },
      { id: "b", entry: null, completed: false },
    ];
    assert.deepEqual(ledger.overlayPending("owner", freshRead), [
      { id: "a", entry: null, completed: false },
      { id: "b", entry: 4, completed: true },
    ]);
  });

  it("derives persisted boolean and numeric completion from the saved response", async () => {
    const { withSavedTrackableEntry } = await import("../src/lib/daily-edit-controller");
    const booleanTrackable = {
      id: "boolean",
      trackingType: "boolean",
      goal: null,
      completed: false,
    };
    assert.equal(
      withSavedTrackableEntry(booleanTrackable, { id: "entry", value: 1 }).completed,
      true
    );
    const numericTrackable = {
      id: "number",
      trackingType: "number",
      goal: { frequency: "daily", targetValue: 8 },
      completed: false,
    };
    assert.equal(
      withSavedTrackableEntry(numericTrackable, { id: "entry", value: 8 }).completed,
      true
    );
  });

  it("keeps the first optimistic value while applying a second concurrent trackable update", () => {
    const dashboard = {
      date: "2026-10-10",
      trackables: [
        {
          id: "a",
          trackingType: "boolean" as const,
          goal: null,
          entry: null,
          completed: false,
          goalProgress: null,
        },
        {
          id: "b",
          trackingType: "number" as const,
          goal: { targetValue: 8, frequency: "daily" as const },
          entry: null,
          completed: false,
          goalProgress: null,
        },
      ],
      progress: { completed: 0, total: 2, percentage: 0 },
    };

    const afterFirst = applyTrackableValue(dashboard, "a", 1);
    const afterSecond = applyTrackableValue(afterFirst, "b", 8);
    assert.equal(afterSecond.trackables[0]!.completed, true);
    assert.equal(afterSecond.trackables[1]!.completed, true);
    assert.equal(afterSecond.progress.completed, 2);
    assert.equal(afterSecond.progress.percentage, 100);
  });

  it("drops late A-B-A network responses based on request generation, not only key", async () => {
    const responses = [deferred<string>(), deferred<string>(), deferred<string>()];
    let nextResponse = 0;
    const coordinator = new DailyReadCoordinator<string>();
    const firstA = coordinator.read("A", () => responses[nextResponse++]!.promise);
    const b = coordinator.read("B", () => responses[nextResponse++]!.promise);
    const secondA = coordinator.read("A", () => responses[nextResponse++]!.promise);
    responses[0]!.resolve("stale A");
    responses[1]!.resolve("stale B");
    responses[2]!.resolve("fresh A");
    assert.equal(await firstA, null);
    assert.equal(await b, null);
    assert.equal(await secondA, "fresh A");
  });
});
