export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  database?: "connected" | "disconnected";
}

// Muscle Groups for Exercise Library
export const MUSCLE_GROUPS = [
  "abdos",
  "biceps",
  "dos",
  "epaules",
  "fessiers",
  "ischios",
  "lombaires",
  "mollets",
  "pecs",
  "quadriceps",
  "trapezes",
  "triceps",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  createdAt: Date;
}
