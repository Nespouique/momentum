import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "../schemas/profile.schema.js";
import { hashPassword, comparePassword } from "../services/auth.service.js";
import { ZodError } from "zod";

const router = Router();

// All profile routes require authentication
router.use(authMiddleware);

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// GET /profile - Get current user's profile
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        height: true,
        goalDescription: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.USER_NOT_FOUND,
          message: "User not found",
        },
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PATCH /profile - Update profile fields
router.patch("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.birthDate !== undefined && {
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
        }),
        ...(data.height !== undefined && { height: data.height }),
        ...(data.goalDescription !== undefined && {
          goalDescription: data.goalDescription,
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        height: true,
        goalDescription: true,
        createdAt: true,
      },
    });

    return res.json(user);
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
    console.error("Update profile error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PUT /profile/password - Change password
router.put("/password", async (req: AuthRequest, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.USER_NOT_FOUND,
          message: "User not found",
        },
      });
    }

    // Verify current password
    const isValidPassword = await comparePassword(
      data.currentPassword,
      user.passwordHash
    );

    if (!isValidPassword) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.INVALID_PASSWORD,
          message: "Current password is incorrect",
        },
      });
    }

    // Hash and update new password
    const newPasswordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({ message: "Password updated successfully" });
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
    console.error("Change password error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
