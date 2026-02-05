import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
} from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema.js";
import {
  requestPasswordReset,
  resetPassword,
} from "../services/password-reset.service.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import { ZodError } from "zod";

const router = Router();

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EMAIL_EXISTS: "EMAIL_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_RESET_TOKEN: "INVALID_RESET_TOKEN",
  EXPIRED_RESET_TOKEN: "EXPIRED_RESET_TOKEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// POST /auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.EMAIL_EXISTS,
          message: "An account with this email already exists",
        },
      });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        height: data.height ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        createdAt: true,
      },
    });

    // Generate token and auto-login
    const { token, expiresAt } = generateToken({
      userId: user.id,
      email: user.email,
    });

    return res.status(201).json({
      user,
      accessToken: token,
      expiresAt: expiresAt.toISOString(),
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
    console.error("Register error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: "Invalid email or password",
        },
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(
      data.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: "Invalid email or password",
        },
      });
    }

    // Generate token
    const { token, expiresAt } = generateToken({
      userId: user.id,
      email: user.email,
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: token,
      expiresAt: expiresAt.toISOString(),
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
    console.error("Login error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  // For JWT-based auth, logout is handled client-side by removing the token
  // This endpoint is here for API completeness and potential future server-side session handling
  return res.json({ message: "Logged out successfully" });
});

// GET /auth/me
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(data.email);
    // Always return 200 — don't reveal if email exists
    return res.json({ message: "If an account exists with this email, a reset link has been sent." });
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
    console.error("Forgot password error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const errorCode = await resetPassword(data.token, data.password);

    if (errorCode) {
      return res.status(400).json({
        error: {
          code: ErrorCodes[errorCode],
          message:
            errorCode === "EXPIRED_RESET_TOKEN"
              ? "This reset link has expired. Please request a new one."
              : "This reset link is invalid. Please request a new one.",
        },
      });
    }

    return res.json({ message: "Password has been reset successfully." });
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
    console.error("Reset password error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
