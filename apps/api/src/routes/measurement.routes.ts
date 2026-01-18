import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import {
  createMeasurementSchema,
  updateMeasurementSchema,
  progressQuerySchema,
} from "../schemas/measurement.schema.js";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";

const router = Router();

// All measurement routes require authentication
router.use(authMiddleware);

// Error codes
const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_DATE: "DUPLICATE_DATE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

// GET /measurements - List all measurements (paginated, sorted by date desc)
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query["limit"] as string) || 20));
    const skip = (page - 1) * limit;

    const [measurements, total] = await Promise.all([
      prisma.measurement.findMany({
        where: { userId: req.userId },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.measurement.count({
        where: { userId: req.userId },
      }),
    ]);

    return res.json({
      data: measurements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List measurements error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /measurements/latest - Get the most recent measurement
router.get("/latest", async (req: AuthRequest, res: Response) => {
  try {
    const measurement = await prisma.measurement.findFirst({
      where: { userId: req.userId },
      orderBy: { date: "desc" },
    });

    if (!measurement) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "No measurements found",
        },
      });
    }

    return res.json(measurement);
  } catch (error) {
    console.error("Get latest measurement error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /measurements/progress - Get progress data for a specific field
router.get("/progress", async (req: AuthRequest, res: Response) => {
  try {
    const query = progressQuerySchema.parse(req.query);
    const { field, period } = query;

    // Calculate date range
    let startDate: Date | undefined;
    const now = new Date();

    switch (period) {
      case "1month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "3months":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case "6months":
        startDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case "1year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "all":
        startDate = undefined;
        break;
    }

    const measurements = await prisma.measurement.findMany({
      where: {
        userId: req.userId,
        ...(startDate && { date: { gte: startDate } }),
      },
      orderBy: { date: "asc" },
    });

    // Filter out entries where the field is null and map to data points
    type MeasurementRecord = typeof measurements[number];
    const data = measurements
      .filter((m) => m[field as keyof MeasurementRecord] !== null)
      .map((m) => ({
        date: m.date.toISOString().split("T")[0],
        value: m[field as keyof MeasurementRecord] as number,
      }));

    // Calculate change
    let change: number | null = null;
    let changePercent: number | null = null;

    if (data.length >= 2) {
      const first = data[0]!.value;
      const last = data[data.length - 1]!.value;
      change = Number((last - first).toFixed(2));
      changePercent = Number(((change / first) * 100).toFixed(2));
    }

    return res.json({
      field,
      period,
      data,
      change,
      changePercent,
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
    console.error("Get progress error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// GET /measurements/:id - Get a specific measurement
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const measurement = await prisma.measurement.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!measurement) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Measurement not found",
        },
      });
    }

    return res.json(measurement);
  } catch (error) {
    console.error("Get measurement error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// POST /measurements - Create a new measurement
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createMeasurementSchema.parse(req.body);

    const measurement = await prisma.measurement.create({
      data: {
        userId: req.userId!,
        date: new Date(data.date),
        weight: data.weight,
        neck: data.neck,
        shoulders: data.shoulders,
        chest: data.chest,
        bicepsLeft: data.bicepsLeft,
        bicepsRight: data.bicepsRight,
        forearmLeft: data.forearmLeft,
        forearmRight: data.forearmRight,
        wristLeft: data.wristLeft,
        wristRight: data.wristRight,
        waist: data.waist,
        hips: data.hips,
        thighLeft: data.thighLeft,
        thighRight: data.thighRight,
        calfLeft: data.calfLeft,
        calfRight: data.calfRight,
        ankleLeft: data.ankleLeft,
        ankleRight: data.ankleRight,
        notes: data.notes,
      },
    });

    return res.status(201).json(measurement);
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error: {
          code: ErrorCodes.DUPLICATE_DATE,
          message: "A measurement already exists for this date",
        },
      });
    }
    console.error("Create measurement error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// PUT /measurements/:id - Update a measurement
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const data = updateMeasurementSchema.parse(req.body);

    // Check if measurement exists and belongs to user
    const existing = await prisma.measurement.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Measurement not found",
        },
      });
    }

    const measurement = await prisma.measurement.update({
      where: { id },
      data: {
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.neck !== undefined && { neck: data.neck }),
        ...(data.shoulders !== undefined && { shoulders: data.shoulders }),
        ...(data.chest !== undefined && { chest: data.chest }),
        ...(data.bicepsLeft !== undefined && { bicepsLeft: data.bicepsLeft }),
        ...(data.bicepsRight !== undefined && { bicepsRight: data.bicepsRight }),
        ...(data.forearmLeft !== undefined && { forearmLeft: data.forearmLeft }),
        ...(data.forearmRight !== undefined && { forearmRight: data.forearmRight }),
        ...(data.wristLeft !== undefined && { wristLeft: data.wristLeft }),
        ...(data.wristRight !== undefined && { wristRight: data.wristRight }),
        ...(data.waist !== undefined && { waist: data.waist }),
        ...(data.hips !== undefined && { hips: data.hips }),
        ...(data.thighLeft !== undefined && { thighLeft: data.thighLeft }),
        ...(data.thighRight !== undefined && { thighRight: data.thighRight }),
        ...(data.calfLeft !== undefined && { calfLeft: data.calfLeft }),
        ...(data.calfRight !== undefined && { calfRight: data.calfRight }),
        ...(data.ankleLeft !== undefined && { ankleLeft: data.ankleLeft }),
        ...(data.ankleRight !== undefined && { ankleRight: data.ankleRight }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return res.json(measurement);
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error: {
          code: ErrorCodes.DUPLICATE_DATE,
          message: "A measurement already exists for this date",
        },
      });
    }
    console.error("Update measurement error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

// DELETE /measurements/:id - Delete a measurement
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    // Check if measurement exists and belongs to user
    const existing = await prisma.measurement.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: "Measurement not found",
        },
      });
    }

    await prisma.measurement.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Delete measurement error:", error);
    return res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    });
  }
});

export default router;
