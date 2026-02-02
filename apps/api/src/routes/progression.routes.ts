import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import { updateSuggestionSchema } from "../schemas/progression.schema.js";
import {
  evaluateSession,
  getSessionSuggestions,
  respondToSuggestion,
} from "../services/progression.service.js";
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

// GET /sessions/:sessionId/progression-suggestions - Get or generate suggestions for a session
router.get(
  "/sessions/:sessionId/progression-suggestions",
  async (req: AuthRequest, res: Response) => {
    try {
      const sessionId = req.params["sessionId"] as string;
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

      // Allow suggestions for in_progress (on summary screen) and completed sessions
      // Abandoned sessions should not get suggestions
      if (session.status === "abandoned") {
        return res.json({ data: [] });
      }

      // Check if suggestions already exist
      let suggestions = await getSessionSuggestions(sessionId);

      // If no suggestions exist, evaluate the session and create them
      if (suggestions.length === 0) {
        await evaluateSession(sessionId);
        suggestions = await getSessionSuggestions(sessionId);
      }

      // Format response
      const formattedSuggestions = suggestions.map((s) => ({
        id: s.id,
        exerciseId: s.exerciseId,
        exerciseName: s.exercise.name,
        suggestionType: s.suggestionType,
        currentValue: s.currentValue,
        suggestedValue: s.suggestedValue,
        reason: s.reason,
        status: s.status,
        createdAt: s.createdAt,
        respondedAt: s.respondedAt,
      }));

      return res.json({ data: formattedSuggestions });
    } catch (error) {
      console.error("Get progression suggestions error:", error);
      return res.status(500).json({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: "An unexpected error occurred",
        },
      });
    }
  }
);

// GET /sessions/:sessionId/stagnation - Detect stagnating exercises
router.get(
  "/sessions/:sessionId/stagnation",
  async (req: AuthRequest, res: Response) => {
    try {
      const sessionId = req.params["sessionId"] as string;
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

      // Ensure suggestions are generated (idempotent)
      await evaluateSession(sessionId);

      // Get exercises with pending suggestions (same logic as progressive overload)
      const pendingSuggestions = await prisma.progressionSuggestion.findMany({
        where: {
          sessionId,
          status: "pending",
        },
        select: { exerciseId: true },
      });
      const stagnatingExerciseIds = pendingSuggestions.map((s) => s.exerciseId);

      // Check if AI coaching is available (API key configured)
      const aiAvailable = !!process.env["OPENAI_API_KEY"];

      return res.json({
        data: {
          hasStagnation: stagnatingExerciseIds.length > 0,
          stagnatingExerciseIds,
          aiCoachingAvailable: aiAvailable && stagnatingExerciseIds.length > 0,
        },
      });
    } catch (error) {
      console.error("Detect stagnation error:", error);
      return res.status(500).json({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: "An unexpected error occurred",
        },
      });
    }
  }
);

// PATCH /progression-suggestions/:id - Accept or dismiss a suggestion
router.patch(
  "/progression-suggestions/:id",
  async (req: AuthRequest, res: Response) => {
    try {
      const suggestionId = req.params["id"] as string;
      const userId = req.userId!;
      const data = updateSuggestionSchema.parse(req.body);

      // Verify suggestion exists and belongs to user
      const suggestion = await prisma.progressionSuggestion.findFirst({
        where: { id: suggestionId, userId },
      });

      if (!suggestion) {
        return res.status(404).json({
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: "Suggestion not found",
          },
        });
      }

      // Update the suggestion and optionally the workout template
      const updatedSuggestion = await respondToSuggestion(
        suggestionId,
        data.status
      );

      return res.json({
        data: {
          id: updatedSuggestion.id,
          status: updatedSuggestion.status,
          respondedAt: updatedSuggestion.respondedAt,
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
      console.error("Update suggestion error:", error);
      return res.status(500).json({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: "An unexpected error occurred",
        },
      });
    }
  }
);

export default router;
