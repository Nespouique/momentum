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
import progressionRoutes from "./routes/progression.routes.js";
import configRoutes from "./routes/config.routes.js";
import aiCoachingRoutes from "./routes/ai-coaching.routes.js";
import healthSyncRoutes from "./routes/health-sync.routes.js";

const app = express();
const PORT = process.env["PORT"] || 3001;
const defaultHost = process.env["NODE_ENV"] === "production" ? "0.0.0.0" : "localhost";
const HOST = process.argv.includes("--host") ? "0.0.0.0" : (process.env["HOST"] || defaultHost);

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

if (HOST === "0.0.0.0") {
  // Allow all origins when exposed on LAN
  app.use(cors({ origin: true, credentials: true }));
} else {
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
}
app.use(express.json());

// Health check endpoint (before auth routes to avoid middleware interference)
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

// Root endpoint
app.get("/", (_req, res) => {
  res.json({ message: "Momentum API" });
});

// Routes
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/measurements", measurementRoutes);
app.use("/exercises", exerciseRoutes);
app.use("/workouts", workoutRoutes);
app.use("/sessions", sessionRoutes);
app.use("/", progressionRoutes);
app.use("/config", configRoutes);
app.use("/sessions", aiCoachingRoutes);
app.use("/health-sync", healthSyncRoutes);

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
