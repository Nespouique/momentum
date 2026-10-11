export class DailySaveGate {
  private readonly activeTrackables = new Set<string>();

  begin(trackableId: string): boolean {
    if (this.activeTrackables.has(trackableId)) return false;
    this.activeTrackables.add(trackableId);
    return true;
  }

  finish(trackableId: string): void {
    this.activeTrackables.delete(trackableId);
  }
}

export class DailyEditLedger<T extends { id: string; entry: unknown; completed: boolean }> {
  private readonly edits = new Map<
    string,
    { original: Map<string, T>; optimistic: Map<string, T>; pending: number; failed: Set<string> }
  >();

  begin(owner: string, original: T): void {
    let edit = this.edits.get(owner);
    if (!edit) {
      edit = { original: new Map(), optimistic: new Map(), pending: 0, failed: new Set() };
      this.edits.set(owner, edit);
    }
    if (!edit.original.has(original.id)) edit.original.set(original.id, original);
    edit.pending += 1;
  }

  setOptimistic(owner: string, trackable: T): void {
    const edit = this.edits.get(owner);
    if (!edit) throw new Error("An edit must be started before its optimistic value is set");
    edit.optimistic.set(trackable.id, trackable);
  }

  commit(owner: string, trackable: T): void {
    const edit = this.edits.get(owner);
    if (!edit) return;
    edit.original.set(trackable.id, trackable);
    edit.optimistic.set(trackable.id, trackable);
  }

  overlayPending<U extends { id: string; entry: unknown; completed: boolean }>(
    owner: string,
    values: U[]
  ): U[] {
    const pending = this.edits.get(owner)?.optimistic;
    if (!pending) return values;
    return values.map((value) => {
      const optimistic = pending.get(value.id);
      return optimistic
        ? { ...value, entry: optimistic.entry, completed: optimistic.completed }
        : value;
    });
  }

  optimisticValue(owner: string, trackableId: string): T | undefined {
    return this.edits.get(owner)?.optimistic.get(trackableId);
  }

  originals(owner: string): T[] {
    return [...(this.edits.get(owner)?.original.values() ?? [])];
  }

  isPending(owner: string): boolean {
    return (this.edits.get(owner)?.pending ?? 0) > 0;
  }

  finish(
    owner: string,
    trackableId: string,
    failed: boolean
  ): { rollback?: T; committed?: T; finished: boolean } {
    const edit = this.edits.get(owner);
    if (!edit) return { finished: true };
    if (failed) edit.failed.add(trackableId);
    edit.pending -= 1;
    const rollback = failed ? edit.original.get(trackableId) : undefined;
    const committed = !failed ? edit.original.get(trackableId) : undefined;
    edit.original.delete(trackableId);
    edit.optimistic.delete(trackableId);
    const finished = edit.pending === 0;
    if (finished) this.edits.delete(owner);
    return { rollback, committed, finished };
  }
}

export function withSavedTrackableEntry<
  T extends {
    trackingType: string;
    goal: { frequency: string; targetValue: number } | null;
    completed: boolean;
  },
  E extends { value: number },
>(trackable: T, entry: E): T & { entry: E } {
  const completed =
    trackable.trackingType === "boolean"
      ? entry.value >= 1
      : trackable.goal?.frequency === "daily"
        ? entry.value >= trackable.goal.targetValue
        : entry.value > 0;
  return { ...trackable, entry, completed };
}

export function applyTrackableValue<
  T extends {
    date: string;
    trackables: Array<{
      id: string;
      trackingType: "boolean" | "number" | "duration";
      goal: { targetValue: number; frequency: "daily" | "weekly" | "monthly" } | null;
      entry: { id: string; value: number; source: "manual" | "health_connect" } | null;
      completed: boolean;
      goalProgress: { current: number; target: number; frequency: "weekly" | "monthly" } | null;
    }>;
    progress: { completed: number; total: number; percentage: number };
  },
>(data: T, trackableId: string, value: number): T {
  let completionDelta = 0;
  const trackables = data.trackables.map((trackable) => {
    if (trackable.id !== trackableId) return trackable;

    const previousValue = trackable.entry?.value ?? 0;
    const completed =
      trackable.trackingType === "boolean"
        ? value >= 1
        : trackable.goal?.frequency === "daily"
          ? value >= trackable.goal.targetValue
          : value > 0;
    completionDelta = Number(completed) - Number(trackable.completed);

    let goalProgress = trackable.goalProgress;
    if (goalProgress) {
      const delta =
        trackable.trackingType === "boolean"
          ? Number(value > 0) - Number(previousValue > 0)
          : value - previousValue;
      goalProgress = { ...goalProgress, current: Math.max(0, goalProgress.current + delta) };
    }

    return {
      ...trackable,
      entry: { id: trackable.entry?.id ?? "temp", value, source: "manual" as const },
      completed,
      goalProgress,
    };
  });

  const completed = Math.max(0, data.progress.completed + completionDelta);
  return {
    ...data,
    trackables,
    progress: {
      ...data.progress,
      completed,
      percentage: data.progress.total > 0 ? Math.round((completed / data.progress.total) * 100) : 0,
    },
  };
}
