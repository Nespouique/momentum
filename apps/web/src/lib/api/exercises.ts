import { MuscleGroup } from "@momentum/shared";

const API_URL = "/backend";

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  createdAt: string;
}

export interface ExerciseListResponse {
  data: Exercise[];
  total: number;
}

export interface MuscleGroupsResponse {
  muscleGroups: MuscleGroup[];
}

export interface CreateExerciseInput {
  name: string;
  muscleGroups: MuscleGroup[];
}

export interface UpdateExerciseInput {
  name?: string;
  muscleGroups?: MuscleGroup[];
}

export interface ExerciseLastPerformance {
  exerciseId: string;
  exercise: {
    id: string;
    name: string;
    muscleGroups: string[];
  };
  sessionId: string;
  completedAt: string;
  workout: {
    id: string;
    name: string;
  };
  sets: Array<{
    setNumber: number;
    actualReps: number | null;
    actualWeight: number | null;
    rpe: number | null;
  }>;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class ExerciseError extends Error {
  code: string;
  details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    code: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "ExerciseError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new ExerciseError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.details
    );
  }

  return data as T;
}

export async function getExercises(
  token: string,
  params?: { muscleGroup?: MuscleGroup; search?: string }
): Promise<ExerciseListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.muscleGroup) {
    searchParams.set("muscleGroup", params.muscleGroup);
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }

  const queryString = searchParams.toString();
  const url = `${API_URL}/exercises${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<ExerciseListResponse>(response);
}

export async function getExercise(
  token: string,
  id: string
): Promise<Exercise> {
  const response = await fetch(`${API_URL}/exercises/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<Exercise>(response);
}

export async function getMuscleGroups(): Promise<MuscleGroupsResponse> {
  const response = await fetch(`${API_URL}/exercises/muscle-groups`);
  return handleResponse<MuscleGroupsResponse>(response);
}

export async function createExercise(
  token: string,
  data: CreateExerciseInput
): Promise<Exercise> {
  const response = await fetch(`${API_URL}/exercises`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Exercise>(response);
}

export async function updateExercise(
  token: string,
  id: string,
  data: UpdateExerciseInput
): Promise<Exercise> {
  const response = await fetch(`${API_URL}/exercises/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Exercise>(response);
}

export async function deleteExercise(
  token: string,
  id: string
): Promise<void> {
  const response = await fetch(`${API_URL}/exercises/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<void>(response);
}

// Exercise stats types
export interface ExerciseSessionData {
  sessionId: string;
  completedAt: string;
  bestE1RM: number;
  totalVolume: number;
  maxWeight: number;
  repsAtMaxWeight: number;
}

export interface PracticedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: string[];
  sessions: ExerciseSessionData[];
}

export interface ExerciseStatsResponse {
  data: PracticedExercise[];
}

export async function getExerciseStats(
  token: string
): Promise<ExerciseStatsResponse> {
  const response = await fetch(`${API_URL}/exercises/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<ExerciseStatsResponse>(response);
}

export async function getExerciseLastPerformance(
  token: string,
  exerciseId: string
): Promise<{ data: ExerciseLastPerformance | null }> {
  const response = await fetch(`${API_URL}/exercises/${exerciseId}/last-performance`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<{ data: ExerciseLastPerformance | null }>(response);
}
