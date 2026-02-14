import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import {
  createTrackableSchema,
  updateTrackableSchema,
  createGoalSchema,
  updateGoalSchema,
  reorderTrackablesSchema,
  suggestIconsSchema,
} from "../schemas/trackable.schema.js";
import {
  getUserTrackables,
  createTrackable,
  updateTrackable,
  deleteTrackable,
  createGoal,
  updateGoal,
  reorderTrackables,
  ensureSleepGoal,
  suggestIcons,
} from "../services/trackable.service.js";
import { ZodError } from "zod";

const router = Router();

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// All routes require authentication
router.use(authMiddleware);

// GET / - List user's trackables (system + custom), sorted by sortOrder
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Ensure sleep goal exists for this user (one-time fix)
    await ensureSleepGoal(userId);

    const trackables = await getUserTrackables(userId);

    return res.json({ data: trackables });
  } catch (error) {
    console.error("List trackables error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST / - Create custom trackable
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createTrackableSchema.parse(req.body);
    const userId = req.userId!;

    const trackable = await createTrackable(userId, data);

    return res.status(201).json(trackable);
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
    console.error("Create trackable error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /suggest-icons - AI icon suggestions
router.post("/suggest-icons", async (req: AuthRequest, res: Response) => {
  try {
    const data = suggestIconsSchema.parse(req.body);
    const result = await suggestIcons(data.name);
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
    if (error instanceof Error && error.message === "OPENAI_API_KEY not configured") {
      return res.status(503).json({
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "AI suggestions are not available",
        },
      });
    }
    console.error("Suggest icons error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PATCH /:id - Update trackable
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTrackableSchema.parse(req.body);
    const userId = req.userId!;
    const trackableId = String(req.params["id"]);

    const trackable = await updateTrackable(userId, trackableId, data);

    if (!trackable) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Trackable not found",
        },
      });
    }

    return res.json(trackable);
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
    console.error("Update trackable error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// DELETE /:id - Delete custom trackable (403 if isSystem=true)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const trackableId = String(req.params["id"]);

    const result = await deleteTrackable(userId, trackableId);

    if (!result.success) {
      if (result.reason === "not_found") {
        return res.status(404).json({
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: "Trackable not found",
          },
        });
      }
      if (result.reason === "system_trackable") {
        return res.status(403).json({
          error: {
            code: ErrorCodes.FORBIDDEN,
            message: "System trackables cannot be deleted",
          },
        });
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Delete trackable error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /:id/goals - Create goal for trackable
router.post("/:id/goals", async (req: AuthRequest, res: Response) => {
  try {
    const data = createGoalSchema.parse(req.body);
    const userId = req.userId!;
    const trackableId = String(req.params["id"]);

    const goal = await createGoal(userId, trackableId, data);

    if (!goal) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Trackable not found",
        },
      });
    }

    return res.status(201).json(goal);
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
    console.error("Create goal error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PATCH /:id/goals/:goalId - Update goal
router.patch("/:id/goals/:goalId", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateGoalSchema.parse(req.body);
    const userId = req.userId!;
    const trackableId = String(req.params["id"]);
    const goalId = String(req.params["goalId"]);

    const goal = await updateGoal(userId, trackableId, goalId, data);

    if (!goal) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Trackable or goal not found",
        },
      });
    }

    return res.json(goal);
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
    console.error("Update goal error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PUT /reorder - Bulk update sortOrder
router.put("/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const data = reorderTrackablesSchema.parse(req.body);
    const userId = req.userId!;

    const result = await reorderTrackables(userId, data.items);

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
    console.error("Reorder trackables error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
