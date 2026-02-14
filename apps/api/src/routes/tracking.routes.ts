import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import {
  trackingEntriesQuerySchema,
  trackingSummaryQuerySchema,
  createEntrySchema,
} from "../schemas/tracking.schema.js";
import {
  getTodayTracking,
  getRingsData,
  getEntries,
  upsertEntry,
  deleteEntry,
  getSummary,
} from "../services/tracking.service.js";
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

// GET /today - Get today's complete tracking state
router.get("/today", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await getTodayTracking(userId);
    return res.json(data);
  } catch (error) {
    console.error("Get today tracking error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /rings - Get Samsung rings data only
router.get("/rings", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await getRingsData(userId);
    return res.json(data);
  } catch (error) {
    console.error("Get rings data error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /entries - Get entry history with filters
router.get("/entries", async (req: AuthRequest, res: Response) => {
  try {
    const query = trackingEntriesQuerySchema.parse(req.query);
    const userId = req.userId!;

    const data = await getEntries(userId, query);
    return res.json(data);
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
    console.error("Get entries error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /entries - Upsert manual entry
router.post("/entries", async (req: AuthRequest, res: Response) => {
  try {
    const data = createEntrySchema.parse(req.body);
    const userId = req.userId!;

    const result = await upsertEntry(userId, data);

    if (!result.success) {
      if (result.reason === "trackable_not_found") {
        return res.status(404).json({
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: "Trackable not found",
          },
        });
      }
      if (result.reason === "cannot_overwrite_health_connect") {
        return res.status(403).json({
          error: {
            code: ErrorCodes.FORBIDDEN,
            message: "Cannot overwrite HealthConnect data",
          },
        });
      }
    }

    return res.status(201).json(result.entry);
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
    console.error("Create entry error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// DELETE /entries/:id - Delete manual entry
router.delete("/entries/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const entryId = String(req.params["id"]);

    const result = await deleteEntry(userId, entryId);

    if (!result.success) {
      if (result.reason === "entry_not_found") {
        return res.status(404).json({
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: "Entry not found",
          },
        });
      }
      if (result.reason === "cannot_delete_health_connect") {
        return res.status(403).json({
          error: {
            code: ErrorCodes.FORBIDDEN,
            message: "Cannot delete HealthConnect data",
          },
        });
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Delete entry error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /summary - Get completion summary statistics
router.get("/summary", async (req: AuthRequest, res: Response) => {
  try {
    const query = trackingSummaryQuerySchema.parse(req.query);
    const userId = req.userId!;

    const data = await getSummary(userId, query.period, query.date);
    return res.json(data);
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
    console.error("Get summary error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
