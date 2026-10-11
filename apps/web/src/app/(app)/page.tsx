"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityRings } from "@/components/tracking/activity-rings";
import { SleepCard } from "@/components/tracking/sleep-card";
import { TrackableCard } from "@/components/tracking/trackable-card";
import { WorkoutSummaryCard } from "@/components/tracking/workout-summary-card";

import { useAuthStore } from "@/stores/auth";
import { getToday, upsertEntry, type TodayResponse } from "@/lib/api/tracking";
import { formatLocalDate } from "@/lib/daily-calendar";
import {
  DailyEditLedger,
  DailySaveGate,
  applyTrackableValue,
  withSavedTrackableEntry,
} from "@/lib/daily-edit-controller";
import { DailyReadCoordinator } from "@/lib/daily-read-coordinator";
import { useLocalDay } from "@/hooks/use-local-day";
import { toast } from "sonner";

export default function Home() {
  const { token, user } = useAuthStore();
  const { selectedDate, today, previousDay, nextDay, canNavigateNext } = useLocalDay();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMutations, setPendingMutations] = useState<Set<string>>(() => new Set());
  const [draftValues, setDraftValues] = useState<Map<string, string>>(() => new Map());
  const generation = useRef(0);
  const activeAccount = useRef<string | null>(null);
  const requestKey = useRef<string | null>(null);
  const latestData = useRef<TodayResponse | null>(null);
  const dataOwner = useRef<string | null>(null);
  const dateSnapshots = useRef(new Map<string, TodayResponse>());
  const optimisticEdits = useRef(new DailyEditLedger<TodayResponse["trackables"][number]>());
  const saveGate = useRef(new DailySaveGate());
  const readCoordinator = useRef(new DailyReadCoordinator<TodayResponse>());
  const latestSelectedDate = useRef<string | null>(selectedDate);
  latestSelectedDate.current = selectedDate;

  const loadData = useCallback(async () => {
    if (!token || !selectedDate) return;
    const key = `${token}:${user?.id ?? "anonymous"}:${selectedDate}`;
    const account = `${token}:${user?.id ?? "anonymous"}`;
    if (activeAccount.current !== account) {
      activeAccount.current = account;
      dateSnapshots.current.clear();
      optimisticEdits.current = new DailyEditLedger<TodayResponse["trackables"][number]>();
      readCoordinator.current.invalidate();
      latestData.current = null;
      dataOwner.current = null;
      setData(null);
    }
    const cached = dateSnapshots.current.get(key) ?? readCoordinator.current.snapshot(key);
    if (requestKey.current !== key) {
      generation.current += 1;
      latestData.current = cached ?? null;
      dataOwner.current = cached ? key : null;
      setData(cached ?? null);
      setIsLoading(cached === undefined);
    }
    requestKey.current = key;
    const currentGeneration = ++generation.current;
    if (dateSnapshots.current.get(key) === undefined) setIsLoading(true);
    try {
      const todayData = await readCoordinator.current.read(key, () =>
        getToday(token, selectedDate)
      );
      if (todayData && generation.current === currentGeneration && requestKey.current === key) {
        todayData.trackables = optimisticEdits.current.overlayPending(key, todayData.trackables);
        const pending = optimisticEdits.current.isPending(key);
        latestData.current = todayData;
        dataOwner.current = key;
        if (!pending) dateSnapshots.current.set(key, todayData);
        setData(todayData);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      if (generation.current === currentGeneration && requestKey.current === key) {
        if (!dateSnapshots.current.has(key)) {
          toast.error("Erreur lors du chargement du tableau de bord");
        }
      }
    } finally {
      if (generation.current === currentGeneration && requestKey.current === key) {
        setIsLoading(false);
      }
    }
  }, [token, user?.id, selectedDate]);

  const snapshotTrackable = useCallback(
    (owner: string, trackable: TodayResponse["trackables"][number]) => {
      optimisticEdits.current.begin(owner, trackable);
      return owner;
    },
    []
  );

  const finishOptimisticEdit = useCallback(
    (key: string, trackableId: string, failed: boolean) => {
      const owner = key;
      const result = optimisticEdits.current.finish(owner, trackableId, failed);
      if (result.rollback) {
        const ownerData =
          dataOwner.current === owner ? latestData.current : dateSnapshots.current.get(owner);
        if (ownerData) {
          const restored = {
            ...ownerData,
            trackables: ownerData.trackables.map((trackable) =>
              trackable.id === trackableId ? result.rollback! : trackable
            ),
          };
          dateSnapshots.current.set(owner, restored);
          if (dataOwner.current === owner) {
            latestData.current = restored;
            setData(restored);
          }
        }
      }
      if (result.committed) {
        const ownerData =
          dataOwner.current === owner ? latestData.current : dateSnapshots.current.get(owner);
        if (ownerData) {
          const committed = {
            ...ownerData,
            trackables: ownerData.trackables.map((trackable) =>
              trackable.id === trackableId ? result.committed! : trackable
            ),
          };
          dateSnapshots.current.set(owner, committed);
          if (dataOwner.current === owner) {
            latestData.current = committed;
            setData(committed);
          }
        }
      }
      const completedDate = owner.slice(owner.lastIndexOf(":") + 1);
      if (result.finished && latestSelectedDate.current === completedDate) void loadData();
    },
    [loadData]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleTrackable = useCallback(
    async (trackableId: string, value: number, editDate: string): Promise<boolean> => {
      const editToken = token;
      const editUserId = user?.id;
      if (!editToken || !editDate) return false;
      const currentAuth = useAuthStore.getState();
      if (currentAuth.token !== editToken || currentAuth.user?.id !== editUserId) return false;
      const owner = `${editToken}:${editUserId ?? "anonymous"}:${editDate}`;
      const snapshot =
        dataOwner.current === owner ? latestData.current : dateSnapshots.current.get(owner);
      if (!snapshot) return false;
      const previousTrackable = snapshot.trackables.find(
        (trackable) => trackable.id === trackableId
      );
      if (!previousTrackable) return false;
      const currentData =
        dataOwner.current === owner ? latestData.current : dateSnapshots.current.get(owner);
      if (!currentData) return false;
      const mutationKey = `${owner}:${trackableId}`;
      if (!saveGate.current.begin(mutationKey)) return false;
      const editKey = snapshotTrackable(owner, previousTrackable);
      setPendingMutations((current) => new Set(current).add(mutationKey));

      // Optimistic update
      const optimisticData = applyTrackableValue(currentData, trackableId, value);
      if (dataOwner.current === owner) latestData.current = optimisticData;
      const original = optimisticEdits.current.originals(owner);
      const originalById = new Map(original.map((item) => [item.id, item]));
      dateSnapshots.current.set(owner, {
        ...optimisticData,
        trackables: optimisticData.trackables.map((item) => originalById.get(item.id) ?? item),
      });
      optimisticEdits.current.setOptimistic(
        editKey,
        optimisticData.trackables.find((trackable) => trackable.id === trackableId)!
      );
      if (dataOwner.current === owner) setData(optimisticData);

      try {
        const savedEntry = await upsertEntry(editToken, {
          trackableId,
          date: editDate,
          value,
        });
        const optimisticTrackable = optimisticEdits.current.optimisticValue(owner, trackableId);
        if (optimisticTrackable) {
          const committed = withSavedTrackableEntry(optimisticTrackable, savedEntry);
          optimisticEdits.current.commit(owner, committed);
          const ownerData = dateSnapshots.current.get(owner);
          if (ownerData) {
            dateSnapshots.current.set(owner, {
              ...ownerData,
              trackables: ownerData.trackables.map((item) =>
                item.id === trackableId ? committed : item
              ),
            });
          }
          if (dataOwner.current === owner && latestData.current) {
            const current = latestData.current;
            const updated = {
              ...current,
              trackables: current.trackables.map((item) =>
                item.id === trackableId ? committed : item
              ),
            };
            latestData.current = updated;
            setData(updated);
          }
        }
        finishOptimisticEdit(editKey, trackableId, false);
        return true;
      } catch (error) {
        console.error("Failed to toggle trackable:", error);
        toast.error("Erreur lors de la mise à jour");
        finishOptimisticEdit(editKey, trackableId, true);
        return false;
      } finally {
        saveGate.current.finish(mutationKey);
        setPendingMutations((current) => {
          const next = new Set(current);
          next.delete(mutationKey);
          return next;
        });
      }
    },
    [snapshotTrackable, finishOptimisticEdit, token, user?.id]
  );

  const persistTrackable = useCallback(
    async (trackableId: string, value: number, editDate: string): Promise<boolean> => {
      const editToken = token;
      const editUserId = user?.id;
      const owner = `${editToken}:${editUserId ?? "anonymous"}:${editDate}`;
      if (!editToken) return false;
      const currentAuth = useAuthStore.getState();
      if (currentAuth.token !== editToken || currentAuth.user?.id !== editUserId) {
        return false;
      }
      const snapshot = dateSnapshots.current.get(owner);
      if (!snapshot) return false;

      // Optimistic update
      const currentData = dataOwner.current === owner ? latestData.current : snapshot;
      const trackable =
        optimisticEdits.current.optimisticValue(owner, trackableId) ??
        currentData?.trackables.find((item) => item.id === trackableId);
      if (!trackable || !currentData) return false;
      const mutationKey = `${owner}:${trackableId}`;
      if (pendingMutations.has(mutationKey)) return false;
      if (!saveGate.current.begin(mutationKey))
        throw new Error("A tracking update is already pending");
      setPendingMutations((currentPending) => new Set(currentPending).add(mutationKey));
      const editKey = snapshotTrackable(owner, trackable);

      const optimisticData = applyTrackableValue(currentData, trackableId, value);
      if (dataOwner.current === owner) latestData.current = optimisticData;
      const original = optimisticEdits.current.originals(owner);
      const originalById = new Map(original.map((item) => [item.id, item]));
      dateSnapshots.current.set(owner, {
        ...optimisticData,
        trackables: optimisticData.trackables.map((item) => originalById.get(item.id) ?? item),
      });
      optimisticEdits.current.setOptimistic(
        editKey,
        optimisticData.trackables.find((item) => item.id === trackableId)!
      );
      if (dataOwner.current === owner) setData(optimisticData);

      try {
        const savedEntry = await upsertEntry(editToken, {
          trackableId,
          date: editDate,
          value,
        });
        const optimisticTrackable = optimisticEdits.current.optimisticValue(owner, trackableId);
        if (optimisticTrackable) {
          const committed = withSavedTrackableEntry(optimisticTrackable, savedEntry);
          optimisticEdits.current.commit(owner, committed);
          const cached = dateSnapshots.current.get(owner);
          if (cached) {
            const updatedCache = {
              ...cached,
              trackables: cached.trackables.map((item) =>
                item.id === trackableId ? committed : item
              ),
            };
            dateSnapshots.current.set(owner, updatedCache);
          }
          if (dataOwner.current === owner && latestData.current) {
            const current = latestData.current;
            const updated = {
              ...current,
              trackables: current.trackables.map((item) =>
                item.id === trackableId ? committed : item
              ),
            };
            latestData.current = updated;
            setData(updated);
          }
        }
        finishOptimisticEdit(editKey, trackableId, false);
        return true;
      } catch (error) {
        console.error("Failed to update trackable:", error);
        toast.error("Erreur lors de la mise à jour");
        finishOptimisticEdit(editKey, trackableId, true);
        throw error;
      } finally {
        saveGate.current.finish(mutationKey);
        setPendingMutations((current) => {
          const next = new Set(current);
          next.delete(mutationKey);
          return next;
        });
      }
    },
    [snapshotTrackable, finishOptimisticEdit, token, user?.id, pendingMutations]
  );

  const handleUpdateTrackable = useCallback(
    async (trackableId: string, value: number, editDate: string): Promise<boolean> => {
      return persistTrackable(trackableId, value, editDate);
    },
    [persistTrackable, token, user?.id]
  );

  const handleDraftChange = useCallback(
    (trackableId: string, value: string | null, editDate: string) => {
      const key = `${token}:${user?.id ?? "anonymous"}:${editDate}:${trackableId}`;
      setDraftValues((current) => {
        const next = new Map(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      });
    },
    [token, user?.id]
  );

  const subtitle = selectedDate ? formatLocalDate(selectedDate) : undefined;
  const navigationActions = selectedDate ? (
    <div className="flex items-center gap-1" aria-label="Navigation par jour">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-12"
        aria-label="Jour précédent"
        onClick={previousDay}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-12 disabled:opacity-40"
        aria-label="Jour suivant"
        disabled={!canNavigateNext || !today}
        onClick={nextDay}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Button>
    </div>
  ) : null;

  if (!selectedDate || (isLoading && data?.date !== selectedDate)) {
    return (
      <div className="pb-8">
        <PageHeader title="Dashboard" subtitle={subtitle} actions={navigationActions} />
        <div className="space-y-6">
          <div className="h-96 animate-pulse rounded-2xl bg-secondary/50" />
          <div className="h-32 animate-pulse rounded-2xl bg-secondary/50" />
          <div className="h-64 animate-pulse rounded-2xl bg-secondary/50" />
        </div>
      </div>
    );
  }

  if (
    !data ||
    data.date !== selectedDate ||
    dataOwner.current !== `${token}:${user?.id ?? "anonymous"}:${selectedDate}`
  ) {
    return (
      <div className="pb-8">
        <PageHeader title="Dashboard" subtitle={subtitle} actions={navigationActions} />
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-center text-muted-foreground">
            Impossible de charger les données du tableau de bord
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-6">
      <PageHeader title="Dashboard" subtitle={subtitle} actions={navigationActions} />

      {/* Activity Rings */}
      <div className="rounded-2xl pb-6">
        <ActivityRings
          steps={data.rings.steps}
          active={data.rings.active}
          calories={data.rings.calories}
        />
      </div>

      {/* Sleep */}
      <SleepCard sleep={data.sleep} />

      {/* Workout Summary */}
      <WorkoutSummaryCard sessions={data.workoutSessions} />

      {/* Manual Trackables */}
      {data.trackables.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            Suivi du jour ({data.trackables.filter((t) => t.completed).length}/
            {data.trackables.length})
          </h2>
          <div className="space-y-3">
            {data.trackables.map((trackable) => (
              <TrackableCard
                key={`${user?.id ?? "anonymous"}:${selectedDate}:${trackable.id}`}
                trackable={trackable}
                date={selectedDate}
                isPending={pendingMutations.has(
                  `${token}:${user?.id ?? "anonymous"}:${selectedDate}:${trackable.id}`
                )}
                draftValue={draftValues.get(
                  `${token}:${user?.id ?? "anonymous"}:${selectedDate}:${trackable.id}`
                )}
                onToggle={handleToggleTrackable}
                onUpdate={handleUpdateTrackable}
                onDraftChange={handleDraftChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
