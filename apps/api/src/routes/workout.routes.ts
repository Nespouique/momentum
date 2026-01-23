import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutQuerySchema,
  CreateWorkoutInput,
} from "../schemas/workout.schema.js";
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

// Include pattern for full workout structure
const workoutInclude = {
  items: {
    orderBy: { position: "asc" as const },
    include: {
      exercises: {
        orderBy: { position: "asc" as const },
        include: {
          exercise: {
            select: { id: true, name: true, muscleGroups: true },
          },
          sets: { orderBy: { setNumber: "asc" as const } },
        },
      },
    },
  },
};

// All routes require authentication
router.use(authMiddleware);

// GET /workouts - List user's workouts
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const query = workoutQuerySchema.parse(req.query);
    const userId = req.userId!;

    const where: {
      userId: string;
      name?: { contains: string; mode: "insensitive" };
    } = { userId };

    if (query.search) {
      where.name = { contains: query.search, mode: "insensitive" };
    }

    const [workouts, total] = await Promise.all([
      prisma.workout.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              exercises: {
                orderBy: { position: "asc" },
                include: {
                  exercise: {
                    select: { id: true, name: true, muscleGroups: true },
                  },
                },
              },
            },
          },
          // Include the last completed session
          sessions: {
            where: { status: "completed" },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { completedAt: true },
          },
        },
      }),
      prisma.workout.count({ where }),
    ]);

    // Transform to include lastCompletedAt at the top level
    const workoutsWithLastSession = workouts.map((workout) => {
      const { sessions, ...rest } = workout;
      return {
        ...rest,
        lastCompletedAt: sessions[0]?.completedAt ?? null,
      };
    });

    return res.json({
      data: workoutsWithLastSession,
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
    console.error("List workouts error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /workouts/:id - Get full workout with nested structure
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const userId = req.userId!;

    const workout = await prisma.workout.findFirst({
      where: { id, userId },
      include: workoutInclude,
    });

    if (!workout) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Workout not found",
        },
      });
    }

    return res.json(workout);
  } catch (error) {
    console.error("Get workout error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /workouts - Create workout with full nested structure
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createWorkoutSchema.parse(req.body);
    const userId = req.userId!;

    const workout = await createWorkoutWithItems(userId, data);

    return res.status(201).json(workout);
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
    if (error instanceof Error && error.message.includes("exercise")) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: error.message,
        },
      });
    }
    console.error("Create workout error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PUT /workouts/:id - Update workout (replace all items)
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const data = updateWorkoutSchema.parse(req.body);
    const userId = req.userId!;

    // Check if workout exists and belongs to user
    const existing = await prisma.workout.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Workout not found",
        },
      });
    }

    const workout = await updateWorkoutWithItems(id, data);

    return res.json(workout);
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
    if (error instanceof Error && error.message.includes("exercise")) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: error.message,
        },
      });
    }
    console.error("Update workout error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// DELETE /workouts/:id - Delete workout (cascade deletes items)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const userId = req.userId!;

    // Check if workout exists and belongs to user
    const existing = await prisma.workout.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Workout not found",
        },
      });
    }

    // Cascade delete is configured in schema, so this deletes all related items
    await prisma.workout.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Delete workout error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /workouts/:id/duplicate - Duplicate a workout
router.post("/:id/duplicate", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const userId = req.userId!;

    // Get the original workout with full structure
    const original = await prisma.workout.findFirst({
      where: { id, userId },
      include: workoutInclude,
    });

    if (!original) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Workout not found",
        },
      });
    }

    // Create duplicate with modified name
    const duplicateData: CreateWorkoutInput = {
      name: `${original.name} (copy)`,
      description: original.description,
      items: original.items.map((item) => ({
        type: item.type as "exercise" | "superset",
        position: item.position,
        rounds: item.rounds,
        restAfter: item.restAfter,
        exercises: item.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          position: ex.position,
          restBetweenSets: ex.restBetweenSets,
          sets: ex.sets.map((set) => ({
            setNumber: set.setNumber,
            targetReps: set.targetReps,
            targetWeight: set.targetWeight,
          })),
        })),
      })),
    };

    const workout = await createWorkoutWithItems(userId, duplicateData);

    return res.status(201).json(workout);
  } catch (error) {
    console.error("Duplicate workout error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// Helper function to create workout with nested items in a transaction
async function createWorkoutWithItems(
  userId: string,
  data: CreateWorkoutInput
) {
  return prisma.$transaction(async (tx) => {
    // Validate that all exerciseIds exist
    const exerciseIds = data.items.flatMap((item) =>
      item.exercises.map((e) => e.exerciseId)
    );
    const uniqueExerciseIds = [...new Set(exerciseIds)];

    const exercises = await tx.exercise.findMany({
      where: { id: { in: uniqueExerciseIds } },
      select: { id: true },
    });

    if (exercises.length !== uniqueExerciseIds.length) {
      const foundIds = new Set(exercises.map((e) => e.id));
      const missingIds = uniqueExerciseIds.filter((id) => !foundIds.has(id));
      throw new Error(
        `One or more exercises do not exist: ${missingIds.join(", ")}`
      );
    }

    // Create the workout with nested structure
    return tx.workout.create({
      data: {
        userId,
        name: data.name,
        description: data.description ?? null,
        items: {
          create: data.items.map((item) => ({
            type: item.type,
            position: item.position,
            rounds: item.rounds,
            restAfter: item.restAfter,
            exercises: {
              create: item.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                position: ex.position,
                restBetweenSets: ex.restBetweenSets,
                sets: {
                  create: ex.sets.map((set) => ({
                    setNumber: set.setNumber,
                    targetReps: set.targetReps,
                    targetWeight: set.targetWeight ?? null,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: workoutInclude,
    });
  });
}

// Helper function to update workout with nested items in a transaction
async function updateWorkoutWithItems(
  workoutId: string,
  data: CreateWorkoutInput
) {
  return prisma.$transaction(async (tx) => {
    // Validate that all exerciseIds exist
    const exerciseIds = data.items.flatMap((item) =>
      item.exercises.map((e) => e.exerciseId)
    );
    const uniqueExerciseIds = [...new Set(exerciseIds)];

    const exercises = await tx.exercise.findMany({
      where: { id: { in: uniqueExerciseIds } },
      select: { id: true },
    });

    if (exercises.length !== uniqueExerciseIds.length) {
      const foundIds = new Set(exercises.map((e) => e.id));
      const missingIds = uniqueExerciseIds.filter((id) => !foundIds.has(id));
      throw new Error(
        `One or more exercises do not exist: ${missingIds.join(", ")}`
      );
    }

    // Delete all existing items (cascade deletes exercises and sets)
    await tx.workoutItem.deleteMany({ where: { workoutId } });

    // Update workout and recreate items
    return tx.workout.update({
      where: { id: workoutId },
      data: {
        name: data.name,
        description: data.description ?? null,
        items: {
          create: data.items.map((item) => ({
            type: item.type,
            position: item.position,
            rounds: item.rounds,
            restAfter: item.restAfter,
            exercises: {
              create: item.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                position: ex.position,
                restBetweenSets: ex.restBetweenSets,
                sets: {
                  create: ex.sets.map((set) => ({
                    setNumber: set.setNumber,
                    targetReps: set.targetReps,
                    targetWeight: set.targetWeight ?? null,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: workoutInclude,
    });
  });
}

export default router;
