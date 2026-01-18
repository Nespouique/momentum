import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { HealthCheckResponse } from "@momentum/shared";

const app = express();
const PORT = process.env["PORT"] || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

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
