const API_URL = "/backend";

// Types matching the backend schema
export interface WorkoutSet {
  id: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
}

export interface WorkoutItemExercise {
  id: string;
  exerciseId: string;
  exercise: {
    id: string;
    name: string;
    muscleGroups: string[];
  };
  position: number;
  restBetweenSets: number;
  sets: WorkoutSet[];
}

export interface WorkoutItem {
  id: string;
  type: "exercise" | "superset";
  position: number;
  rounds: number;
  restAfter: number;
  exercises: WorkoutItemExercise[];
}

export interface Workout {
  id: string;
  name: string;
  description: string | null;
  items: WorkoutItem[];
  createdAt: string;
  updatedAt: string;
  lastCompletedAt: string | null;
}

export interface WorkoutListResponse {
  data: Workout[];
  total: number;
}

// Input types for creating/updating
export interface WorkoutSetInput {
  setNumber: number;
  targetReps: number;
  targetWeight?: number | null;
}

export interface WorkoutItemExerciseInput {
  exerciseId: string;
  position: number;
  restBetweenSets: number;
  sets: WorkoutSetInput[];
}

export interface WorkoutItemInput {
  type: "exercise" | "superset";
  position: number;
  rounds: number;
  restAfter: number;
  exercises: WorkoutItemExerciseInput[];
}

export interface CreateWorkoutInput {
  name: string;
  description?: string | null;
  items: WorkoutItemInput[];
}

export interface UpdateWorkoutInput extends CreateWorkoutInput {}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class WorkoutError extends Error {
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
    this.name = "WorkoutError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new WorkoutError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.details
    );
  }

  return data as T;
}

export async function getWorkouts(
  token: string,
  params?: { search?: string }
): Promise<WorkoutListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) {
    searchParams.set("search", params.search);
  }

  const queryString = searchParams.toString();
  const url = `${API_URL}/workouts${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<WorkoutListResponse>(response);
}

export async function getWorkout(token: string, id: string): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<Workout>(response);
}

export async function createWorkout(
  token: string,
  data: CreateWorkoutInput
): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Workout>(response);
}

export async function updateWorkout(
  token: string,
  id: string,
  data: UpdateWorkoutInput
): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Workout>(response);
}

export async function deleteWorkout(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_URL}/workouts/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<void>(response);
}

export async function duplicateWorkout(
  token: string,
  id: string
): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${id}/duplicate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<Workout>(response);
}
