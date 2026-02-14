import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import { healthSyncRequestSchema, healthActivitiesQuerySchema } from "../schemas/health-sync.schema.js";
import { ZodError } from "zod";

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const router = Router();

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// System trackable definitions (PRD section 5.1)
const HEALTH_CONNECT_TRACKABLES = [
  {
    name: "Pas",
    icon: "footprints",
    color: "#22C55E",
    trackingType: "number" as const,
    unit: "pas",
    isSystem: true,
    defaultGoal: { targetValue: 10000, frequency: "daily" as const },
  },
  {
    name: "Minutes d'activite",
    icon: "timer",
    color: "#3B82F6",
    trackingType: "duration" as const,
    unit: "min",
    isSystem: true,
    defaultGoal: { targetValue: 90, frequency: "daily" as const },
  },
  {
    name: "Calories actives",
    icon: "flame",
    color: "#EF4444",
    trackingType: "number" as const,
    unit: "kcal",
    isSystem: true,
    defaultGoal: { targetValue: 500, frequency: "daily" as const },
  },
  {
    name: "Durée sommeil",
    icon: "moon",
    color: "#8B5CF6",
    trackingType: "duration" as const,
    unit: "min",
    isSystem: true,
    defaultGoal: { targetValue: 480, frequency: "daily" as const },
  },
];

/**
 * Lazily creates system trackable items for a user if they don't exist.
 * Returns a map of trackable name -> trackable ID.
 */
async function ensureSystemTrackables(
  tx: PrismaTransactionClient,
  userId: string
): Promise<Map<string, string>> {
  const trackableMap = new Map<string, string>();

  for (const trackableDef of HEALTH_CONNECT_TRACKABLES) {
    let trackable = await tx.trackableItem.findFirst({
      where: { userId, name: trackableDef.name, isSystem: true },
    });

    if (!trackable) {
      trackable = await tx.trackableItem.create({
        data: {
          userId,
          name: trackableDef.name,
          icon: trackableDef.icon,
          color: trackableDef.color,
          trackingType: trackableDef.trackingType,
          unit: trackableDef.unit,
          isSystem: true,
          isActive: true,
        },
      });

      // Create default goal if defined
      if (trackableDef.defaultGoal) {
        await tx.trackableGoal.create({
          data: {
            trackableId: trackable.id,
            targetValue: trackableDef.defaultGoal.targetValue,
            frequency: trackableDef.defaultGoal.frequency,
          },
        });
      }
    }

    trackableMap.set(trackableDef.name, trackable.id);
  }

  return trackableMap;
}

// All routes require authentication
router.use(authMiddleware);

// POST / - Sync health data batch
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = healthSyncRequestSchema.parse(req.body);
    const userId = req.userId!;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert SyncDevice
      let syncDevice = await tx.syncDevice.findFirst({
        where: { userId, deviceName: data.deviceName },
      });
      if (syncDevice) {
        syncDevice = await tx.syncDevice.update({
          where: { id: syncDevice.id },
          data: { lastSyncAt: new Date(data.syncedAt) },
        });
      } else {
        syncDevice = await tx.syncDevice.create({
          data: {
            userId,
            deviceName: data.deviceName,
            lastSyncAt: new Date(data.syncedAt),
          },
        });
      }

      // 2. Ensure system trackables exist for this user (lazy creation)
      const trackableMap = await ensureSystemTrackables(tx, userId);

      // 3. Upsert DailyEntries from dailyMetrics
      let dailyMetricsCount = 0;
      for (const metric of data.dailyMetrics) {
        const date = new Date(metric.date);
        const metricsToUpsert = [
          { trackableName: "Pas", value: metric.steps },
          { trackableName: "Calories actives", value: metric.activeCalories },
          { trackableName: "Minutes d'activite", value: metric.activeMinutes },
        ];

        for (const { trackableName, value } of metricsToUpsert) {
          if (value === null) continue;
          const trackableId = trackableMap.get(trackableName)!;
          await tx.dailyEntry.upsert({
            where: { trackableId_date: { trackableId, date } },
            update: { value, source: "health_connect" },
            create: { trackableId, date, value, source: "health_connect" },
          });
          dailyMetricsCount++;
        }
      }

      // 4. Upsert DailyEntries from sleepSessions
      let sleepCount = 0;
      const sleepTrackableId = trackableMap.get("Durée sommeil")!;
      for (const sleep of data.sleepSessions) {
        const date = new Date(sleep.date);
        const value = sleep.durationMinutes;
        await tx.dailyEntry.upsert({
          where: { trackableId_date: { trackableId: sleepTrackableId, date } },
          update: { value, source: "health_connect" },
          create: { trackableId: sleepTrackableId, date, value, source: "health_connect" },
        });
        sleepCount++;
      }

      // 5. Upsert HealthActivities
      let activitiesCount = 0;
      for (const activity of data.activities) {
        await tx.healthActivity.upsert({
          where: {
            userId_hcRecordId: { userId, hcRecordId: activity.hcRecordId },
          },
          update: {
            date: new Date(activity.date),
            startTime: new Date(activity.startTime),
            endTime: new Date(activity.endTime),
            activityType: activity.activityType,
            title: activity.title,
            durationMinutes: activity.durationMinutes,
            calories: activity.calories,
            distance: activity.distance,
            heartRateAvg: activity.heartRateAvg,
            sourceApp: activity.sourceApp,
          },
          create: {
            userId,
            hcRecordId: activity.hcRecordId,
            date: new Date(activity.date),
            startTime: new Date(activity.startTime),
            endTime: new Date(activity.endTime),
            activityType: activity.activityType,
            title: activity.title,
            durationMinutes: activity.durationMinutes,
            calories: activity.calories,
            distance: activity.distance,
            heartRateAvg: activity.heartRateAvg,
            sourceApp: activity.sourceApp,
          },
        });
        activitiesCount++;
      }

      return {
        synced: {
          dailyMetrics: dailyMetricsCount,
          activities: activitiesCount,
          sleepSessions: sleepCount,
        },
        device: {
          id: syncDevice.id,
          lastSyncAt: syncDevice.lastSyncAt.toISOString(),
        },
      };
    });

    return res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Validation failed",
          details: formatZodError(error),
        },
      });
    }
    console.error("Health sync error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /status - Get sync status
router.get("/status", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get latest sync device for last sync timestamp
    const latestDevice = await prisma.syncDevice.findFirst({
      where: { userId },
      orderBy: { lastSyncAt: "desc" },
    });

    // Get system trackables with their active goals
    const systemTrackables = await prisma.trackableItem.findMany({
      where: { userId, isSystem: true },
      include: {
        goals: {
          where: { endDate: null },
          take: 1,
        },
      },
    });

    // Map French trackable names to English API response keys
    const TRACKABLE_KEY_MAP: Record<string, string> = {
      Pas: "steps",
      "Calories actives": "activeCalories",
      "Minutes d'activite": "activeMinutes",
      "Durée sommeil": "sleepDuration",
    };

    const trackables: Record<string, { id: string; goalValue: number | null }> = {};
    for (const trackable of systemTrackables) {
      const key = TRACKABLE_KEY_MAP[trackable.name];
      if (key) {
        trackables[key] = {
          id: trackable.id,
          goalValue: trackable.goals[0]?.targetValue ?? null,
        };
      }
    }

    return res.json({
      configured: systemTrackables.length > 0,
      lastSync: latestDevice?.lastSyncAt.toISOString() ?? null,
      trackables,
    });
  } catch (error) {
    console.error("Get health sync status error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /activities - List health activities with pagination and filtering
router.get("/activities", async (req: AuthRequest, res: Response) => {
  try {
    const query = healthActivitiesQuerySchema.parse(req.query);
    const userId = req.userId!;

    // Build where clause
    const where: {
      userId: string;
      activityType?: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId };

    if (query.activityType) {
      where.activityType = query.activityType;
    }

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = query.from;
      if (query.to) where.date.lte = query.to;
    }

    // Query with pagination (same pattern as session.routes.ts)
    const [data, total] = await Promise.all([
      prisma.healthActivity.findMany({
        where,
        orderBy: { date: "desc" },
        skip: query.offset,
        take: query.limit,
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          activityType: true,
          title: true,
          durationMinutes: true,
          calories: true,
          distance: true,
          heartRateAvg: true,
          sourceApp: true,
        },
      }),
      prisma.healthActivity.count({ where }),
    ]);

    return res.json({
      data,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Validation failed",
          details: formatZodError(error),
        },
      });
    }
    console.error("List health activities error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
