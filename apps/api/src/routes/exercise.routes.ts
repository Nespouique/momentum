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
