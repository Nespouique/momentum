import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import {
  createExerciseSchema,
  updateExerciseSchema,
  exerciseQuerySchema,
} from "../schemas/exercise.schema.js";
import { MUSCLE_GROUPS } from "@momentum/shared";
import { ZodError } from "zod";

const router = Router();

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// GET /exercises/muscle-groups - Get list of all muscle groups (public)
router.get("/muscle-groups", (_req, res: Response) => {
  return res.json({ muscleGroups: MUSCLE_GROUPS });
});

// All other exercise routes require authentication
router.use(authMiddleware);

// GET /exercises/stats - Get exercise statistics for charts (all practiced exercises)
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Fetch all completed session exercises with their completed sets
    // in a single query, grouped by exercise
    const sessionExercises = await prisma.sessionExercise.findMany({
      where: {
        session: {
          userId,
          status: "completed",
        },
        status: { notIn: ["substituted", "skipped"] },
        sets: {
          some: {
            actualReps: { not: null },
            actualWeight: { not: null },
          },
        },
      },
      select: {
        exerciseId: true,
        exercise: {
          select: { id: true, name: true, muscleGroups: true },
        },
        session: {
          select: { id: true, completedAt: true },
        },
        sets: {
          where: {
            actualReps: { not: null },
            actualWeight: { not: null },
          },
          select: {
            actualReps: true,
            actualWeight: true,
          },
        },
      },
      orderBy: {
        session: { completedAt: "asc" },
      },
    });

    // Group by exercise and compute per-session metrics
    const exerciseMap = new Map<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        muscleGroups: string[];
        sessions: Array<{
          sessionId: string;
          completedAt: string;
          bestE1RM: number;
          totalVolume: number;
          maxWeight: number;
          repsAtMaxWeight: number;
        }>;
      }
    >();

    for (const se of sessionExercises) {
      if (!se.session.completedAt) continue;

      const key = se.exerciseId;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          exerciseId: se.exercise.id,
          exerciseName: se.exercise.name,
          muscleGroups: se.exercise.muscleGroups,
          sessions: [],
        });
      }

      // Calculate metrics from sets
      let bestE1RM = 0;
      let totalVolume = 0;
      let maxWeight = 0;
      let repsAtMaxWeight = 0;

      for (const set of se.sets) {
        const weight = set.actualWeight!;
        const reps = set.actualReps!;

        // E1RM (Epley formula)
        const e1rm = weight * (1 + reps / 30);
        if (e1rm > bestE1RM) {
          bestE1RM = e1rm;
        }

        // Volume
        totalVolume += weight * reps;

        // Max weight
        if (weight > maxWeight) {
          maxWeight = weight;
          repsAtMaxWeight = reps;
        }
      }

      exerciseMap.get(key)!.sessions.push({
        sessionId: se.session.id,
        completedAt: se.session.completedAt.toISOString(),
        bestE1RM: Math.round(bestE1RM * 10) / 10,
        totalVolume: Math.round(totalVolume * 10) / 10,
        maxWeight,
        repsAtMaxWeight,
      });
    }

    // Convert map to sorted array
    const exercises = Array.from(exerciseMap.values()).sort((a, b) =>
      a.exerciseName.localeCompare(b.exerciseName, "fr")
    );

    return res.json({ data: exercises });
  } catch (error) {
    console.error("Get exercise stats error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /exercises - List all exercises (shared library)
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const query = exerciseQuerySchema.parse(req.query);
    const { muscleGroup, search } = query;

    // Build where clause
    const where: {
      muscleGroups?: { has: string };
      name?: { contains: string; mode: "insensitive" };
    } = {};

    // Filter by muscle group
    if (muscleGroup) {
      where.muscleGroups = { has: muscleGroup };
    }

    // Search by name
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        orderBy: { name: "asc" },
      }),
      prisma.exercise.count({ where }),
    ]);

    return res.json({
      data: exercises,
      total,
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
    console.error("List exercises error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /exercises/:id - Get a specific exercise
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;

    const exercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Exercise not found",
        },
      });
    }

    return res.json(exercise);
  } catch (error) {
    console.error("Get exercise error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /exercises/:id/last-performance - Get last performance for an exercise across all sessions
router.get("/:id/last-performance", async (req: AuthRequest, res: Response) => {
  try {
    const exerciseId = req.params["id"] as string;
    const userId = req.userId!;

    // Find the most recent completed session exercise for this exercise
    // We check session is completed and has at least one completed set
    // We don't check sessionExercise.status since it may not be updated to "completed"
    const lastSessionExercise = await prisma.sessionExercise.findFirst({
      where: {
        exerciseId,
        session: {
          userId,
          status: "completed",
        },
        // Exclude substituted/skipped exercises
        status: { notIn: ["substituted", "skipped"] },
        // Only include exercises that have at least one completed set
        sets: {
          some: {
            completedAt: { not: null },
          },
        },
      },
      orderBy: {
        session: {
          completedAt: "desc",
        },
      },
      include: {
        exercise: {
          select: { id: true, name: true, muscleGroups: true },
        },
        session: {
          select: { id: true, completedAt: true, workout: { select: { id: true, name: true } } },
        },
        sets: {
          where: {
            completedAt: { not: null },
          },
          orderBy: { setNumber: "asc" },
        },
      },
    });

    if (!lastSessionExercise) {
      return res.json({ data: null });
    }

    return res.json({
      data: {
        exerciseId: lastSessionExercise.exerciseId,
        exercise: lastSessionExercise.exercise,
        sessionId: lastSessionExercise.session.id,
        completedAt: lastSessionExercise.session.completedAt,
        workout: lastSessionExercise.session.workout,
        sets: lastSessionExercise.sets.map((set) => ({
          setNumber: set.setNumber,
          actualReps: set.actualReps,
          actualWeight: set.actualWeight,
          rpe: set.rpe,
        })),
      },
    });
  } catch (error) {
    console.error("Get last performance error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /exercises - Create an exercise (shared library)
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createExerciseSchema.parse(req.body);

    const exercise = await prisma.exercise.create({
      data: {
        name: data.name,
        muscleGroups: data.muscleGroups,
      },
    });

    return res.status(201).json(exercise);
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
    console.error("Create exercise error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PUT /exercises/:id - Update an exercise
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const data = updateExerciseSchema.parse(req.body);

    // Check if exercise exists
    const existing = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Exercise not found",
        },
      });
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.muscleGroups !== undefined && { muscleGroups: data.muscleGroups }),
      },
    });

    return res.json(exercise);
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
    console.error("Update exercise error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// DELETE /exercises/:id - Delete an exercise (not if used in programs)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;

    // Check if exercise exists
    const existing = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Exercise not found",
        },
      });
    }

    // Check if exercise is used in any workout
    const usedInWorkouts = await prisma.workoutItemExercise.count({
      where: { exerciseId: id }
    });
    if (usedInWorkouts > 0) {
      return res.status(409).json({
        error: {
          code: ErrorCodes.CONFLICT,
          message: "Cannot delete exercise used in workout programs",
        },
      });
    }

    await prisma.exercise.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Delete exercise error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
