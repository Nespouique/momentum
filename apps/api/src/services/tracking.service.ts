import { prisma } from "../lib/prisma.js";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

/**
 * Get the local date as a UTC midnight Date for Prisma DATE column queries.
 * Prevents timezone mismatch: startOfDay() in CET produces 23:00Z which PostgreSQL (UTC)
 * casts to the previous day's DATE.
 */
function localDateForQuery(): { dateStr: string; date: Date } {
  const dateStr = format(new Date(), "yyyy-MM-dd");
  return { dateStr, date: new Date(dateStr + "T00:00:00.000Z") };
}

/**
 * Get today's complete tracking state
 */
export async function getTodayTracking(userId: string) {
  const { dateStr: todayStr, date: today } = localDateForQuery();

  // Get all trackables for user with their active goals
  const trackables = await prisma.trackableItem.findMany({
    where: { userId },
    include: {
      goals: {
        where: { endDate: null },
        take: 1,
      },
      entries: {
        where: { date: today },
        take: 1,
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Separate system trackables from custom ones
  const systemTrackables = trackables.filter((t) => t.isSystem);
  const customTrackables = trackables.filter((t) => !t.isSystem && t.isActive);

  // Find specific system trackables for rings and sleep
  const stepsTrackable = systemTrackables.find((t) => t.name === "Pas");
  const activeMinutesTrackable = systemTrackables.find((t) => t.name === "Minutes d'activite");
  const caloriesTrackable = systemTrackables.find((t) => t.name === "Calories actives");
  const sleepTrackable = systemTrackables.find((t) => t.name === "Durée sommeil");

  // Build rings data
  const rings = {
    steps: buildRingData(stepsTrackable),
    active: buildRingData(activeMinutesTrackable),
    calories: buildRingData(caloriesTrackable),
  };

  // Build sleep data
  const sleep = buildSleepData(sleepTrackable);

  // Build custom trackables data
  const trackablesData = customTrackables.map((trackable) => ({
    id: trackable.id,
    name: trackable.name,
    icon: trackable.icon,
    color: trackable.color,
    trackingType: trackable.trackingType,
    unit: trackable.unit,
    goal: trackable.goals[0] || null,
    entry: trackable.entries[0] || null,
    completed: trackable.entries[0] && trackable.goals[0]
      ? trackable.entries[0].value >= trackable.goals[0].targetValue
      : false,
  }));

  // Count workout sessions (from workout_sessions table)
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const [todaySessions, weekSessions, monthSessions] = await Promise.all([
    prisma.workoutSession.count({
      where: {
        userId,
        status: "completed",
        completedAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.workoutSession.count({
      where: {
        userId,
        status: "completed",
        completedAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.workoutSession.count({
      where: {
        userId,
        status: "completed",
        completedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
  ]);

  // TODO: In future, add a "workout" system trackable with weekly/monthly goals
  const workoutSessions = {
    today: todaySessions,
    thisWeek: weekSessions,
    thisMonth: monthSessions,
    goal: null, // No goal tracking for workouts yet (future Story 3.x)
  };

  // Calculate overall progress (completed / total active trackables)
  const totalActive = customTrackables.length;
  const completed = trackablesData.filter((t) => t.completed).length;
  const percentage = totalActive > 0 ? Math.round((completed / totalActive) * 100) : 0;

  const progress = {
    completed,
    total: totalActive,
    percentage,
  };

  return {
    date: todayStr,
    rings,
    sleep,
    trackables: trackablesData,
    workoutSessions,
    progress,
  };
}

/**
 * Get Samsung rings data only (steps, active minutes, calories)
 */
export async function getRingsData(userId: string) {
  const { date: today } = localDateForQuery();

  const systemTrackables = await prisma.trackableItem.findMany({
    where: {
      userId,
      isSystem: true,
      name: { in: ["Pas", "Minutes d'activite", "Calories actives"] },
    },
    include: {
      goals: {
        where: { endDate: null },
        take: 1,
      },
      entries: {
        where: { date: today },
        take: 1,
      },
    },
  });

  const stepsTrackable = systemTrackables.find((t) => t.name === "Pas");
  const activeMinutesTrackable = systemTrackables.find((t) => t.name === "Minutes d'activite");
  const caloriesTrackable = systemTrackables.find((t) => t.name === "Calories actives");

  return {
    steps: buildRingData(stepsTrackable),
    active: buildRingData(activeMinutesTrackable),
    calories: buildRingData(caloriesTrackable),
  };
}

/**
 * Get entry history with filters
 */
export async function getEntries(
  userId: string,
  filters: {
    from?: Date;
    to?: Date;
    trackableId?: string;
    limit: number;
    offset: number;
  }
) {
  const where: {
    trackable: { userId: string };
    trackableId?: string;
    date?: { gte?: Date; lte?: Date };
  } = {
    trackable: { userId },
  };

  if (filters.trackableId) {
    where.trackableId = filters.trackableId;
  }

  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }

  const [data, total] = await Promise.all([
    prisma.dailyEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip: filters.offset,
      take: filters.limit,
      include: {
        trackable: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            trackingType: true,
            unit: true,
          },
        },
      },
    }),
    prisma.dailyEntry.count({ where }),
  ]);

  return {
    data,
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
}

/**
 * Upsert a manual tracking entry
 */
export async function upsertEntry(
  userId: string,
  data: {
    trackableId: string;
    date: string;
    value: number;
    notes?: string;
  }
) {
  // Verify trackable ownership
  const trackable = await prisma.trackableItem.findFirst({
    where: { id: data.trackableId, userId },
  });

  if (!trackable) {
    return { success: false, reason: "trackable_not_found" };
  }

  // Check if trying to overwrite a health_connect entry
  const date = new Date(data.date);
  const existingEntry = await prisma.dailyEntry.findUnique({
    where: { trackableId_date: { trackableId: data.trackableId, date } },
  });

  if (existingEntry && existingEntry.source === "health_connect") {
    return { success: false, reason: "cannot_overwrite_health_connect" };
  }

  // Upsert entry
  const entry = await prisma.dailyEntry.upsert({
    where: { trackableId_date: { trackableId: data.trackableId, date } },
    update: {
      value: data.value,
      notes: data.notes,
      source: "manual",
    },
    create: {
      trackableId: data.trackableId,
      date,
      value: data.value,
      notes: data.notes,
      source: "manual",
    },
  });

  return { success: true, entry };
}

/**
 * Delete a manual entry (403 if source = health_connect)
 */
export async function deleteEntry(userId: string, entryId: string) {
  // Find entry and verify ownership through trackable
  const entry = await prisma.dailyEntry.findFirst({
    where: {
      id: entryId,
      trackable: { userId },
    },
  });

  if (!entry) {
    return { success: false, reason: "entry_not_found" };
  }

  if (entry.source === "health_connect") {
    return { success: false, reason: "cannot_delete_health_connect" };
  }

  await prisma.dailyEntry.delete({
    where: { id: entryId },
  });

  return { success: true };
}

/**
 * Get completion summary statistics for a period
 */
export async function getSummary(
  userId: string,
  period: "week" | "month",
  date: Date = new Date()
) {
  // Use UTC midnight dates for Prisma DATE column queries
  const startLocal = period === "week"
    ? startOfWeek(date, { weekStartsOn: 1 })
    : startOfMonth(date);
  const endLocal = period === "week"
    ? endOfWeek(date, { weekStartsOn: 1 })
    : endOfMonth(date);
  const start = new Date(format(startLocal, "yyyy-MM-dd") + "T00:00:00.000Z");
  const end = new Date(format(endLocal, "yyyy-MM-dd") + "T00:00:00.000Z");

  // Get all active trackables with their goals
  const trackables = await prisma.trackableItem.findMany({
    where: { userId, isActive: true },
    include: {
      goals: {
        where: { endDate: null },
        take: 1,
      },
      entries: {
        where: {
          date: { gte: start, lte: end },
        },
      },
    },
  });

  // Calculate completion stats per trackable
  const summary = trackables.map((trackable) => {
    const goal = trackable.goals[0];
    if (!goal) {
      return {
        trackableId: trackable.id,
        name: trackable.name,
        completionRate: 0,
        daysCompleted: 0,
        totalDays: 0,
      };
    }

    const entries = trackable.entries;
    const daysCompleted = entries.filter((entry) => entry.value >= goal.targetValue).length;
    const totalDays = entries.length;
    const completionRate = totalDays > 0 ? Math.round((daysCompleted / totalDays) * 100) : 0;

    return {
      trackableId: trackable.id,
      name: trackable.name,
      completionRate,
      daysCompleted,
      totalDays,
    };
  });

  return {
    period,
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
    trackables: summary,
  };
}

// --- Helper functions ---

function buildRingData(trackable: { id: string; entries: { value: number }[]; goals: { targetValue: number }[] } | undefined) {
  if (!trackable) {
    return { value: 0, goal: 0, percentage: 0, trackableId: null };
  }

  const entry = trackable.entries[0];
  const goal = trackable.goals[0];

  const value = entry?.value ?? 0;
  const goalValue = goal?.targetValue ?? 0;
  const percentage = goalValue > 0 ? Math.round((value / goalValue) * 100) : 0;

  return {
    value,
    goal: goalValue,
    percentage,
    trackableId: trackable.id,
  };
}

function buildSleepData(trackable: { id: string; entries: { value: number }[]; goals: { targetValue: number }[] } | undefined) {
  if (!trackable) {
    return { value: 0, goal: null, percentage: 0, trackableId: null };
  }

  const entry = trackable.entries[0];
  const goal = trackable.goals[0];

  const value = entry?.value ?? 0;
  const goalValue = goal?.targetValue ?? null;
  const percentage = goalValue ? Math.round((value / goalValue) * 100) : 0;

  return {
    value,
    goal: goalValue,
    percentage,
    trackableId: trackable.id,
  };
}
