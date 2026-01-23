import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import {
  createSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
  updateSessionExerciseSchema,
  substituteExerciseSchema,
  reorderExercisesSchema,
  recordSetResultSchema,
  updateSetSchema,
  lastSessionQuerySchema,
} from "../schemas/session.schema.js";
import { ZodError } from "zod";

const router = Router();

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  SESSION_ALREADY_ACTIVE: "SESSION_ALREADY_ACTIVE",
  SESSION_NOT_ACTIVE: "SESSION_NOT_ACTIVE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// Include patterns for session queries
const sessionInclude = {
  workout: {
    select: { id: true, name: true, description: true },
  },
  exercises: {
    orderBy: { position: "asc" as const },
    include: {
      exercise: {
        select: { id: true, name: true, muscleGroups: true },
      },
      workoutItem: {
        select: { id: true, type: true, rounds: true, restAfter: true },
      },
      workoutItemExercise: {
        select: { id: true, restBetweenSets: true },
      },
      sets: { orderBy: { setNumber: "asc" as const } },
    },
  },
};

// All routes require authentication
router.use(authMiddleware);

// GET /sessions/active - Get active session (must be before /:id)
router.get("/active", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const session = await prisma.workoutSession.findFirst({
      where: { userId, status: "in_progress" },
      include: sessionInclude,
    });

    if (!session) {
      return res.json({ data: null });
    }

    return res.json({ data: session });
  } catch (error) {
    console.error("Get active session error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /sessions/last - Get last completed session for a workout
router.get("/last", async (req: AuthRequest, res: Response) => {
  try {
    const query = lastSessionQuerySchema.parse(req.query);
    const userId = req.userId!;

    const session = await prisma.workoutSession.findFirst({
      where: {
        userId,
        workoutId: query.workoutId,
        status: "completed",
      },
      orderBy: { completedAt: "desc" },
      include: sessionInclude,
    });

    if (!session) {
      return res.json({ data: null });
    }

    return res.json({ data: session });
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
    console.error("Get last session error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /sessions - List user's sessions with filters and pagination
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const query = sessionQuerySchema.parse(req.query);
    const userId = req.userId!;

    const where: {
      userId: string;
      status?: "in_progress" | "completed" | "abandoned";
      workoutId?: string;
      startedAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.workoutId) {
      where.workoutId = query.workoutId;
    }
    if (query.from || query.to) {
      where.startedAt = {};
      if (query.from) where.startedAt.gte = query.from;
      if (query.to) where.startedAt.lte = query.to;
    }

    const [sessions, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: query.offset,
        take: query.limit,
        include: {
          workout: {
            select: { id: true, name: true },
          },
          exercises: {
            select: { id: true, status: true },
          },
        },
      }),
      prisma.workoutSession.count({ where }),
    ]);

    return res.json({
      data: sessions,
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
    console.error("List sessions error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /sessions/:id - Get single session with full details
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const userId = req.userId!;

    const session = await prisma.workoutSession.findFirst({
      where: { id, userId },
      include: sessionInclude,
    });

    if (!session) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    // Also get last completed session for comparison
    const lastSession = await prisma.workoutSession.findFirst({
      where: {
        userId,
        workoutId: session.workoutId,
        status: "completed",
        id: { not: session.id },
      },
      orderBy: { completedAt: "desc" },
      include: sessionInclude,
    });

    return res.json({ data: session, lastSession: lastSession || null });
  } catch (error) {
    console.error("Get session error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /sessions - Start a new session
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSessionSchema.parse(req.body);
    const userId = req.userId!;

    // Check for existing active session
    const existingSession = await prisma.workoutSession.findFirst({
      where: { userId, status: "in_progress" },
    });

    if (existingSession) {
      return res.status(409).json({
        error: {
          code: ErrorCodes.SESSION_ALREADY_ACTIVE,
          message: "You already have an active session",
          activeSessionId: existingSession.id,
        },
      });
    }

    // Get the workout with full structure
    const workout = await prisma.workout.findFirst({
      where: { id: data.workoutId, userId },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            exercises: {
              orderBy: { position: "asc" },
              include: {
                exercise: true,
                sets: { orderBy: { setNumber: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!workout) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Workout not found",
        },
      });
    }

    // Flatten exercises for session (preserving superset grouping via workoutItemId)
    const flattenedExercises: Array<{
      exerciseId: string;
      workoutItemId: string;
      workoutItemExerciseId: string;
      sets: Array<{ setNumber: number; targetReps: number; targetWeight: number | null }>;
    }> = [];

    for (const item of workout.items) {
      for (const itemExercise of item.exercises) {
        flattenedExercises.push({
          exerciseId: itemExercise.exerciseId,
          workoutItemId: item.id,
          workoutItemExerciseId: itemExercise.id,
          sets: itemExercise.sets.map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            targetWeight: s.targetWeight,
          })),
        });
      }
    }

    // Create the session with exercises and sets
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        workoutId: data.workoutId,
        exercises: {
          create: flattenedExercises.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            workoutItemId: ex.workoutItemId,
            workoutItemExerciseId: ex.workoutItemExerciseId,
            position: index,
            sets: {
              create: ex.sets.map((set) => ({
                setNumber: set.setNumber,
                targetReps: set.targetReps,
                targetWeight: set.targetWeight,
              })),
            },
          })),
        },
      },
      include: sessionInclude,
    });

    // Get last completed session for comparison
    const lastSession = await prisma.workoutSession.findFirst({
      where: {
        userId,
        workoutId: data.workoutId,
        status: "completed",
      },
      orderBy: { completedAt: "desc" },
      include: sessionInclude,
    });

    return res.status(201).json({ data: session, lastSession: lastSession || null });
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
    console.error("Create session error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PATCH /sessions/:id - Update session (status/notes)
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const data = updateSessionSchema.parse(req.body);
    const userId = req.userId!;

    const existing = await prisma.workoutSession.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    const updateData: { status?: "completed" | "abandoned"; notes?: string; completedAt?: Date } = {};

    if (data.status) {
      updateData.status = data.status;
      // Set completedAt when completing or abandoning
      if (data.status === "completed" || data.status === "abandoned") {
        updateData.completedAt = new Date();
      }
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const session = await prisma.workoutSession.update({
      where: { id },
      data: updateData,
      include: sessionInclude,
    });

    return res.json({ data: session });
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
    console.error("Update session error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// DELETE /sessions/:id - Delete session
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const userId = req.userId!;

    const existing = await prisma.workoutSession.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    await prisma.workoutSession.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Delete session error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PATCH /sessions/:id/exercises/:exerciseId - Update exercise status (skip)
router.patch("/:id/exercises/:exerciseId", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const exerciseId = req.params["exerciseId"] as string;
    const data = updateSessionExerciseSchema.parse(req.body);
    const userId = req.userId!;

    // Verify session exists, is active, and belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    if (session.status !== "in_progress") {
      return res.status(400).json({
        error: {
          code: ErrorCodes.SESSION_NOT_ACTIVE,
          message: "Session is not active",
        },
      });
    }

    // Verify exercise belongs to session
    const exercise = await prisma.sessionExercise.findFirst({
      where: { id: exerciseId, sessionId },
    });

    if (!exercise) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Exercise not found in session",
        },
      });
    }

    const updatedExercise = await prisma.sessionExercise.update({
      where: { id: exerciseId },
      data: { status: data.status },
      include: {
        exercise: {
          select: { id: true, name: true, muscleGroups: true },
        },
        sets: { orderBy: { setNumber: "asc" } },
      },
    });

    return res.json({ data: updatedExercise });
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
    console.error("Update session exercise error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /sessions/:id/exercises/:exerciseId/substitute - Substitute exercise
router.post("/:id/exercises/:exerciseId/substitute", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const exerciseId = req.params["exerciseId"] as string;
    const data = substituteExerciseSchema.parse(req.body);
    const userId = req.userId!;

    // Verify session exists, is active, and belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    if (session.status !== "in_progress") {
      return res.status(400).json({
        error: {
          code: ErrorCodes.SESSION_NOT_ACTIVE,
          message: "Session is not active",
        },
      });
    }

    // Verify exercise belongs to session
    const originalExercise = await prisma.sessionExercise.findFirst({
      where: { id: exerciseId, sessionId },
      include: {
        sets: { orderBy: { setNumber: "asc" } },
      },
    });

    if (!originalExercise) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Exercise not found in session",
        },
      });
    }

    // Verify new exercise exists
    const newExercise = await prisma.exercise.findUnique({
      where: { id: data.newExerciseId },
    });

    if (!newExercise) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "New exercise not found",
        },
      });
    }

    // Transaction: mark original as substituted and create new exercise
    const result = await prisma.$transaction(async (tx) => {
      // Mark original as substituted
      await tx.sessionExercise.update({
        where: { id: exerciseId },
        data: { status: "substituted" },
      });

      // Create new exercise with same sets
      return tx.sessionExercise.create({
        data: {
          sessionId,
          exerciseId: data.newExerciseId,
          workoutItemId: originalExercise.workoutItemId,
          workoutItemExerciseId: originalExercise.workoutItemExerciseId,
          position: originalExercise.position,
          substitutedFromId: exerciseId,
          sets: {
            create: originalExercise.sets.map((set) => ({
              setNumber: set.setNumber,
              targetReps: set.targetReps,
              targetWeight: set.targetWeight,
            })),
          },
        },
        include: {
          exercise: {
            select: { id: true, name: true, muscleGroups: true },
          },
          sets: { orderBy: { setNumber: "asc" } },
        },
      });
    });

    return res.status(201).json({ data: result });
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
    console.error("Substitute exercise error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PUT /sessions/:id/exercises/reorder - Reorder exercises
router.put("/:id/exercises/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const data = reorderExercisesSchema.parse(req.body);
    const userId = req.userId!;

    // Verify session exists, is active, and belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    if (session.status !== "in_progress") {
      return res.status(400).json({
        error: {
          code: ErrorCodes.SESSION_NOT_ACTIVE,
          message: "Session is not active",
        },
      });
    }

    // Verify all exercise IDs belong to this session
    const exercises = await prisma.sessionExercise.findMany({
      where: {
        sessionId,
        id: { in: data.exerciseIds },
        status: { notIn: ["substituted", "skipped"] },
      },
    });

    if (exercises.length !== data.exerciseIds.length) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Some exercise IDs are invalid or not part of this session",
        },
      });
    }

    // Update positions in a transaction
    await prisma.$transaction(
      data.exerciseIds.map((id, index) =>
        prisma.sessionExercise.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    // Return updated exercises
    const updatedExercises = await prisma.sessionExercise.findMany({
      where: { sessionId, status: { notIn: ["substituted"] } },
      orderBy: { position: "asc" },
      include: {
        exercise: {
          select: { id: true, name: true, muscleGroups: true },
        },
        sets: { orderBy: { setNumber: "asc" } },
      },
    });

    return res.json({ data: updatedExercises });
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
    console.error("Reorder exercises error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /sessions/:id/exercises/:exerciseId/sets - Record set result
router.post("/:id/exercises/:exerciseId/sets", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const exerciseId = req.params["exerciseId"] as string;
    const data = recordSetResultSchema.parse(req.body);
    const userId = req.userId!;

    // Verify session exists, is active, and belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    if (session.status !== "in_progress") {
      return res.status(400).json({
        error: {
          code: ErrorCodes.SESSION_NOT_ACTIVE,
          message: "Session is not active",
        },
      });
    }

    // Verify exercise belongs to session
    const exercise = await prisma.sessionExercise.findFirst({
      where: { id: exerciseId, sessionId },
    });

    if (!exercise) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Exercise not found in session",
        },
      });
    }

    // Find the set by set number
    const set = await prisma.sessionSet.findFirst({
      where: {
        sessionExerciseId: exerciseId,
        setNumber: data.setNumber,
      },
    });

    if (!set) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: `Set ${data.setNumber} not found for this exercise`,
        },
      });
    }

    // Update the set with actual results
    const updatedSet = await prisma.sessionSet.update({
      where: { id: set.id },
      data: {
        actualReps: data.actualReps,
        actualWeight: data.actualWeight,
        rpe: data.rpe ?? null,
        completedAt: new Date(),
      },
    });

    return res.json({ data: updatedSet });
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
    console.error("Record set result error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PUT /sessions/:id/sets/:setId - Update set
router.put("/:id/sets/:setId", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const setId = req.params["setId"] as string;
    const data = updateSetSchema.parse(req.body);
    const userId = req.userId!;

    // Verify session exists and belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    // Verify set belongs to session
    const set = await prisma.sessionSet.findFirst({
      where: { id: setId },
      include: {
        sessionExercise: {
          select: { sessionId: true },
        },
      },
    });

    if (!set || set.sessionExercise.sessionId !== sessionId) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Set not found in session",
        },
      });
    }

    const updatedSet = await prisma.sessionSet.update({
      where: { id: setId },
      data: {
        actualReps: data.actualReps ?? set.actualReps,
        actualWeight: data.actualWeight ?? set.actualWeight,
        rpe: data.rpe !== undefined ? data.rpe : set.rpe,
      },
    });

    return res.json({ data: updatedSet });
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
    console.error("Update set error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// DELETE /sessions/:id/sets/:setId - Delete set
router.delete("/:id/sets/:setId", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const setId = req.params["setId"] as string;
    const userId = req.userId!;

    // Verify session exists and belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Session not found",
        },
      });
    }

    if (session.status !== "in_progress") {
      return res.status(400).json({
        error: {
          code: ErrorCodes.SESSION_NOT_ACTIVE,
          message: "Session is not active",
        },
      });
    }

    // Verify set belongs to session
    const set = await prisma.sessionSet.findFirst({
      where: { id: setId },
      include: {
        sessionExercise: {
          select: { sessionId: true },
        },
      },
    });

    if (!set || set.sessionExercise.sessionId !== sessionId) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Set not found in session",
        },
      });
    }

    await prisma.sessionSet.delete({
      where: { id: setId },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Delete set error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
