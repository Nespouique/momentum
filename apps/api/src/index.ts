import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { HealthCheckResponse } from "@momentum/shared";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import measurementRoutes from "./routes/measurement.routes.js";

const app = express();
const PORT = process.env["PORT"] || 3001;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from localhost on any port in development
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ];
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

app.get("/health", (_req, res) => {
  const response: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

app.get("/", (_req, res) => {
  res.json({ message: "Momentum API" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
