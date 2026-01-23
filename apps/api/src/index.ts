import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { HealthCheckResponse } from "@momentum/shared";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import measurementRoutes from "./routes/measurement.routes.js";
import exerciseRoutes from "./routes/exercise.routes.js";
import workoutRoutes from "./routes/workout.routes.js";
import sessionRoutes from "./routes/session.routes.js";

const app = express();
const PORT = process.env["PORT"] || 3001;

app.use(helmet());

// Configure allowed origins for CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];
// Add production frontend URL if configured
if (process.env["FRONTEND_URL"]) {
  allowedOrigins.push(process.env["FRONTEND_URL"]);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/measurements", measurementRoutes);
app.use("/exercises", exerciseRoutes);
app.use("/workouts", workoutRoutes);
app.use("/sessions", sessionRoutes);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const response: HealthCheckResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    };
    res.json(response);
  } catch {
    const response: HealthCheckResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    };
    res.status(503).json(response);
  }
});

app.get("/", (_req, res) => {
  res.json({ message: "Momentum API" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
