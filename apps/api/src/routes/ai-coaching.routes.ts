import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import { applyCoachingSchema } from "../schemas/ai-coaching.schema.js";
import {
  generateCoachingAdvice,
  applyCoachingProposals,
} from "../services/ai-coaching.service.js";
import { ZodError } from "zod";

const router = Router();

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
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

// POST /sessions/:id/ai-coaching - Generate AI coaching advice
router.post("/:id/ai-coaching", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const userId = req.userId!;

    // Check if OpenAI API key is configured
    if (!process.env["OPENAI_API_KEY"]) {
      return res.status(503).json({
        error: {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: "AI coaching is not available",
        },
      });
    }

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

    // Generate coaching advice
    const advice = await generateCoachingAdvice(sessionId);

    return res.json({ data: advice });
  } catch (error) {
    console.error("Generate AI coaching error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
    });
  }
});

// POST /sessions/:id/apply-coaching - Apply AI coaching proposals
router.post("/:id/apply-coaching", async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params["id"] as string;
    const userId = req.userId!;
    const data = applyCoachingSchema.parse(req.body);

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

    // Apply the proposals
    await applyCoachingProposals(sessionId, data.proposals);

    return res.json({
      data: {
        success: true,
        appliedCount: data.proposals.length,
      },
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
    console.error("Apply AI coaching error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
    });
  }
});

export default router;
