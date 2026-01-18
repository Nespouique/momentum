import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { HealthCheckResponse } from "@momentum/shared";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";

const app = express();
const PORT = process.env["PORT"] || 3001;

app.use(helmet());
app.use(
  cors({
    origin: process.env["FRONTEND_URL"] || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);

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
