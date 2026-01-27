"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { getSessions, deleteSession, type SessionListItem } from "@/lib/api/sessions";
import { getWorkouts, type Workout } from "@/lib/api/workouts";
import { type MuscleGroup } from "@/lib/constants/muscle-groups";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { WorkoutCard } from "./workout-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SessionCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EnrichedSession extends SessionListItem {
  workoutData: Workout | null;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/**
 * Get first day of month (0 = Sunday, 1 = Monday, etc.)
 * Adjusted for French calendar (Monday = 0)
 */
function getFirstDayOfMonth(year: number, month: number): number {
  const date = new Date(year, month, 1);
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Convert to Monday-first (0-6)
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get sessions grouped by date
 */
function groupSessionsByDate(sessions: EnrichedSession[]): Map<string, EnrichedSession[]> {
  const grouped = new Map<string, EnrichedSession[]>();

  sessions.forEach((session) => {
    // Use completedAt for the date, or startedAt if not completed
    const dateStr = session.completedAt || session.startedAt;
    const date = new Date(dateStr);
    const dateKey = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(session);
  });

  return grouped;
}

/**
 * Extracts muscle groups from a workout, sorted by frequency
 */
function extractMuscleGroups(workout: Workout | null): MuscleGroup[] {
  if (!workout) return [];

  const allMuscleGroups = workout.items.flatMap((item) =>
    item.exercises.flatMap((ex) => ex.exercise.muscleGroups)
  );
  const muscleGroupCounts = allMuscleGroups.reduce(
    (acc, group) => {
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return Object.entries(muscleGroupCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([group]) => group as MuscleGroup);
}

/**
 * Counts exercises that were actually performed in the session
 */
function countPerformedExercises(session: SessionListItem): number {
  return session.exercises.filter(
    (ex) => ex.status !== "skipped" && ex.status !== "substituted"
  ).length;
}

/**
 * Maps a session to a Workout-like object for WorkoutCard
 */
function sessionToWorkoutLike(session: EnrichedSession): Workout {
  return {
    id: session.workout.id,
    name: session.workout.name,
    description: null,
    lastCompletedAt: session.completedAt,
    items: session.workoutData?.items || [],
    createdAt: session.startedAt,
    updatedAt: session.completedAt || session.startedAt,
  };
}

export function SessionCalendarSheet({ open, onOpenChange }: SessionCalendarSheetProps) {
  const router = useRouter();
  const { token } = useAuthStore();

  // Current viewed month
  const [viewDate, setViewDate] = useState(() => new Date());
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Workouts map for enriching sessions
  const workoutsMapRef = useRef<Map<string, Workout>>(new Map());

  // Selected day for showing sessions list
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Delete state
  const [deletingSession, setDeletingSession] = useState<EnrichedSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [monthStats, setMonthStats] = useState({ current: 0, previous: 0 });
  const [yearStats, setYearStats] = useState({ current: 0, previous: 0 });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Group sessions by date
  const sessionsByDate = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const days: { day: number; isCurrentMonth: boolean; dateKey: string }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      days.push({
        day,
        isCurrentMonth: false,
        dateKey: formatDateKey(prevYear, prevMonth, day),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        dateKey: formatDateKey(year, month, day),
      });
    }

    // Next month days (fill to complete last row)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        days.push({
          day,
          isCurrentMonth: false,
          dateKey: formatDateKey(nextYear, nextMonth, day),
        });
      }
    }

    return days;
  }, [year, month]);

  // Load workouts to enrich sessions
  const loadWorkouts = useCallback(async () => {
    if (!token) return new Map<string, Workout>();

    try {
      const result = await getWorkouts(token);
      const map = new Map<string, Workout>();
      result.data.forEach((workout) => {
        map.set(workout.id, workout);
      });
      workoutsMapRef.current = map;
      return map;
    } catch (error) {
      console.error("Failed to load workouts:", error);
      return new Map<string, Workout>();
    }
  }, [token]);

  // Load sessions for the current month view
  const loadSessions = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      // Load workouts first if not already loaded
      let workouts = workoutsMapRef.current;
      if (workouts.size === 0) {
        workouts = await loadWorkouts();
      }

      // Get date range for the month (with some buffer for prev/next month days)
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month + 2, 0);

      const result = await getSessions(token, {
        status: "completed",
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 100,
      });

      // Enrich sessions with workout data
      const enrichedSessions: EnrichedSession[] = result.data.map((session) => ({
        ...session,
        workoutData: workouts.get(session.workoutId) || null,
      }));

      setSessions(enrichedSessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast.error("Erreur lors du chargement des séances");
    } finally {
      setIsLoading(false);
    }
  }, [token, year, month, loadWorkouts]);

  // Load stats for the viewed month and year
  const loadStats = useCallback(async () => {
    if (!token) return;

    setStatsLoading(true);
    try {
      // Date ranges for viewed month
      const viewedMonthStart = new Date(year, month, 1);
      const viewedMonthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      // Date ranges for previous month (relative to viewed month)
      const prevMonthStart = new Date(year, month - 1, 1);
      const prevMonthEnd = new Date(year, month, 0, 23, 59, 59);

      // Date ranges for viewed year
      const viewedYearStart = new Date(year, 0, 1);
      const viewedYearEnd = new Date(year, 11, 31, 23, 59, 59);

      // Date ranges for previous year
      const prevYearStart = new Date(year - 1, 0, 1);
      const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59);

      // Fetch all stats in parallel
      const [viewedMonthRes, prevMonthRes, viewedYearRes, prevYearRes] = await Promise.all([
        getSessions(token, {
          status: "completed",
          from: viewedMonthStart.toISOString(),
          to: viewedMonthEnd.toISOString(),
          limit: 1,
        }),
        getSessions(token, {
          status: "completed",
          from: prevMonthStart.toISOString(),
          to: prevMonthEnd.toISOString(),
          limit: 1,
        }),
        getSessions(token, {
          status: "completed",
          from: viewedYearStart.toISOString(),
          to: viewedYearEnd.toISOString(),
          limit: 1,
        }),
        getSessions(token, {
          status: "completed",
          from: prevYearStart.toISOString(),
          to: prevYearEnd.toISOString(),
          limit: 1,
        }),
      ]);

      setMonthStats({ current: viewedMonthRes.total, previous: prevMonthRes.total });
      setYearStats({ current: viewedYearRes.total, previous: prevYearRes.total });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [token, year, month]);

  // Load sessions and stats when sheet opens or month changes
  useEffect(() => {
    if (open) {
      loadSessions();
      loadStats();
    }
  }, [open, loadSessions, loadStats]);

  // Reset selected day when month changes
  useEffect(() => {
    setSelectedDay(null);
  }, [year, month]);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dateKey: string, isCurrentMonth: boolean) => {
    // Only allow clicking on current month days
    if (!isCurrentMonth) return;

    // Always select the day to show info
    setSelectedDay(dateKey);
  };

  const handleSessionClick = (session: SessionListItem) => {
    onOpenChange(false);
    router.push(`/sessions/${session.id}`);
  };

  const handleDeleteClick = (session: EnrichedSession) => {
    setDeletingSession(session);
  };

  const handleDeleteConfirm = async () => {
    if (!token || !deletingSession) return;

    setIsDeleting(true);
    try {
      await deleteSession(token, deletingSession.id);
      toast.success("Séance supprimée");
      setDeletingSession(null);
      // Reload sessions
      loadSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedDaySessions = selectedDay ? sessionsByDate.get(selectedDay) || [] : [];

  // Check if today
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Compute diffs
  const monthDiff = monthStats.current - monthStats.previous;
  const yearDiff = yearStats.current - yearStats.previous;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>Statistiques des séances</SheetTitle>
          <SheetDescription>
            Visualisez vos entrainements passés
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold">
              {MONTHS_FR[month]} {year}
            </h3>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <StatItem
              title="Ce mois-ci"
              period={MONTHS_FR[month]?.toLowerCase() ?? ""}
              value={monthStats.current}
              diff={monthDiff}
              isLoading={statsLoading}
            />
            <StatItem
              title="Cette année"
              period={String(year)}
              value={yearStats.current}
              diff={yearDiff}
              isLoading={statsLoading}
            />
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day, i) => (
              <div
                key={i}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-zinc-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ day, isCurrentMonth, dateKey }, index) => {
                const daySessions = sessionsByDate.get(dateKey) || [];
                const hasSession = daySessions.length > 0;
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDay;

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(dateKey, isCurrentMonth)}
                    disabled={!isCurrentMonth}
                    className={cn(
                      "aspect-square rounded-lg border border-zinc-800/60 p-1 flex flex-col items-center transition-colors",
                      isCurrentMonth
                        ? "bg-zinc-900/40 cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/60"
                        : "bg-zinc-950/20 opacity-40",
                      isToday && "border-primary/50",
                      isSelected && "border-primary bg-zinc-800/80"
                    )}
                  >
                    {/* Day number */}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isCurrentMonth ? "text-zinc-300" : "text-zinc-600",
                        isToday && "text-primary"
                      )}
                    >
                      {day}
                    </span>

                    {/* Session dots */}
                    {hasSession && (
                      <div className="flex-1 flex items-center justify-center">
                        <SessionDots count={daySessions.length} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected day sessions list */}
          {selectedDay && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {formatSelectedDate(selectedDay)}
                {selectedDaySessions.length > 0 && (
                  <> - {selectedDaySessions.length} séance{selectedDaySessions.length > 1 ? "s" : ""}</>
                )}
              </h4>
              {selectedDaySessions.length > 0 ? (
                <div className="space-y-3">
                  {selectedDaySessions.map((session) => (
                    <WorkoutCard
                      key={session.id}
                      workout={sessionToWorkoutLike(session)}
                      variant="history"
                      completedExerciseCount={countPerformedExercises(session)}
                      sessionDate={session.completedAt}
                      overrideMuscleGroups={extractMuscleGroups(session.workoutData)}
                      onEdit={() => handleSessionClick(session)}
                      onDelete={() => handleDeleteClick(session)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune séance</p>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-white" />
              <span>Séance terminée</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Delete confirmation dialog */}
    <ConfirmDeleteDialog
      open={!!deletingSession}
      onOpenChange={(open) => {
        if (!open) setDeletingSession(null);
      }}
      title="Supprimer cette séance"
      description="Cette action est irréversible. Les données de cette séance seront définitivement supprimées."
      onConfirm={handleDeleteConfirm}
      isDeleting={isDeleting}
    />
  </>
  );
}

/**
 * Displays session dots for a day
 */
function SessionDots({ count }: { count: number }) {
  const maxDots = 4;
  const showOverflow = count > maxDots;
  const displayCount = showOverflow ? maxDots - 1 : count;

  return (
    <div className="flex flex-wrap gap-0.5 justify-center items-center max-w-[calc(100%-4px)]">
      {Array.from({ length: displayCount }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-white shrink-0"
        />
      ))}
      {showOverflow && (
        <span className="text-[8px] font-medium text-zinc-400 ml-0.5">
          +{count - displayCount}
        </span>
      )}
    </div>
  );
}

/**
 * Format selected date for display
 */
function formatSelectedDate(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 2024;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Stats item component
 */
function StatItem({
  title,
  period,
  value,
  diff,
  isLoading,
}: {
  title: string;
  period: string;
  value: number;
  diff: number;
  isLoading: boolean;
}) {
  const isPositive = diff > 0;
  const isNegative = diff < 0;

  if (isLoading) {
    return (
      <div className="space-y-2 flex flex-col items-center">
        <div className="h-3 w-20 bg-zinc-800/30 rounded animate-pulse" />
        <div className="h-8 w-14 bg-zinc-800/40 rounded animate-pulse" />
        <div className="h-3 w-16 bg-zinc-800/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5 text-center">
      {/* Title + period */}
      <div className="flex items-baseline justify-center gap-1.5">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {title}
        </span>
        <span className="text-xs text-zinc-600">
          {period}
        </span>
      </div>

      {/* Value - hero element */}
      <div className="text-3xl font-bold tracking-tight text-zinc-100 tabular-nums">
        {value}
      </div>

      {/* Trend indicator */}
      <div className="flex items-center justify-center gap-1.5">
        <div
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium tabular-nums",
            isPositive && "text-emerald-400",
            isNegative && "text-red-400",
            !isPositive && !isNegative && "text-zinc-600"
          )}
        >
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
          <span>{isPositive ? "+" : ""}{diff}</span>
        </div>
        <span className="text-[10px] text-zinc-600">
          vs {title === "Ce mois-ci" ? "mois préc." : "année préc."}
        </span>
      </div>
    </div>
  );
}

