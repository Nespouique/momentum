"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { ActivityRings } from "@/components/tracking/activity-rings";
import { SleepCard } from "@/components/tracking/sleep-card";
import { TrackableCard } from "@/components/tracking/trackable-card";
import { WorkoutSummaryCard } from "@/components/tracking/workout-summary-card";
import { DailyProgressBar } from "@/components/tracking/daily-progress-bar";
import { useAuthStore } from "@/stores/auth";
import { getToday, upsertEntry, type TodayResponse } from "@/lib/api/tracking";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const todayData = await getToday(token);
      setData(todayData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Erreur lors du chargement du tableau de bord");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleTrackable = async (trackableId: string, value: number) => {
    if (!token || !data) return;

    // Optimistic update
    const optimisticData = {
      ...data,
      trackables: data.trackables.map((t) =>
        t.id === trackableId
          ? {
              ...t,
              entry: value === 1 ? { id: "temp", value, source: "manual" as const } : null,
              completed: value === 1,
            }
          : t
      ),
    };
    setData(optimisticData);

    try {
      await upsertEntry(token, {
        trackableId,
        date: data.date,
        value,
      });
      // Reload to get updated progress
      await loadData();
    } catch (error) {
      console.error("Failed to toggle trackable:", error);
      toast.error("Erreur lors de la mise à jour");
      // Revert optimistic update
      await loadData();
    }
  };

  const handleUpdateTrackable = async (trackableId: string, value: number) => {
    if (!token || !data) return;

    // Optimistic update
    const trackable = data.trackables.find((t) => t.id === trackableId);
    if (!trackable) return;

    const isCompleted = trackable.goal
      ? value >= trackable.goal.targetValue
      : value > 0;

    const optimisticData = {
      ...data,
      trackables: data.trackables.map((t) =>
        t.id === trackableId
          ? {
              ...t,
              entry: { id: t.entry?.id || "temp", value, source: "manual" as const },
              completed: isCompleted,
            }
          : t
      ),
    };
    setData(optimisticData);

    try {
      await upsertEntry(token, {
        trackableId,
        date: data.date,
        value,
      });
      // Reload to get updated progress
      await loadData();
    } catch (error) {
      console.error("Failed to update trackable:", error);
      toast.error("Erreur lors de la mise à jour");
      // Revert optimistic update
      await loadData();
    }
  };

  const handleStartWorkout = () => {
    router.push("/workouts");
  };

  if (isLoading) {
    return (
      <div className="pb-8">
        <PageHeader title="Aujourd'hui" subtitle={user ? `Bonjour, ${user.name.split(" ")[0]}` : undefined} />
        <div className="space-y-6">
          <div className="h-96 animate-pulse rounded-2xl bg-secondary/50" />
          <div className="h-32 animate-pulse rounded-2xl bg-secondary/50" />
          <div className="h-64 animate-pulse rounded-2xl bg-secondary/50" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pb-8">
        <PageHeader title="Aujourd'hui" subtitle={user ? `Bonjour, ${user.name.split(" ")[0]}` : undefined} />
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
      <PageHeader
        title="Aujourd'hui"
        subtitle={user ? `Bonjour, ${user.name.split(" ")[0]}` : undefined}
      />

      {/* Activity Rings */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
        <ActivityRings
          steps={data.rings.steps}
          active={data.rings.active}
          calories={data.rings.calories}
        />
      </div>

      {/* Sleep */}
      <SleepCard sleep={data.sleep} />

      {/* Manual Trackables */}
      {data.trackables.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            Suivi du jour
          </h2>
          <div className="space-y-3">
            {data.trackables.map((trackable) => (
              <TrackableCard
                key={trackable.id}
                trackable={trackable}
                onToggle={handleToggleTrackable}
                onUpdate={handleUpdateTrackable}
              />
            ))}
          </div>
        </div>
      )}

      {/* Workout Summary */}
      <WorkoutSummaryCard
        sessions={data.workoutSessions}
        onStartSession={handleStartWorkout}
      />

      {/* Daily Progress */}
      <DailyProgressBar progress={data.progress} />
    </div>
  );
}
