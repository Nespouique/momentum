const API_URL = "/backend";

// Types matching the backend schema
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type SessionExerciseStatus = "pending" | "in_progress" | "completed" | "skipped" | "substituted";

export interface SessionSet {
  id: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  actualReps: number | null;
  actualWeight: number | null;
  rpe: number | null;
  completedAt: string | null;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exercise: {
    id: string;
    name: string;
    muscleGroups: string[];
  };
  workoutItem: {
    id: string;
    type: "exercise" | "superset";
    rounds: number;
    restAfter: number;
  } | null;
  workoutItemExercise: {
    id: string;
    restBetweenSets: number;
  } | null;
  status: SessionExerciseStatus;
  position: number;
  substitutedFromId: string | null;
  sets: SessionSet[];
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workout: {
    id: string;
    name: string;
    description: string | null;
  };
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  exercises: SessionExercise[];
}

export interface SessionListItem {
  id: string;
  workoutId: string;
  workout: {
    id: string;
    name: string;
  };
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  exercises: { id: string; status: SessionExerciseStatus }[];
}

export interface SessionListResponse {
  data: SessionListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionResponse {
  data: WorkoutSession;
  lastSession: WorkoutSession | null;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    activeSessionId?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class SessionError extends Error {
  code: string;
  activeSessionId?: string;
  details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    code: string,
    activeSessionId?: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.code = code;
    this.activeSessionId = activeSessionId;
    this.details = details;
    this.name = "SessionError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new SessionError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.activeSessionId,
      errorData.error.details
    );
  }

  return data as T;
}

// Session endpoints
export async function startSession(
  token: string,
  workoutId: string
): Promise<SessionResponse> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ workoutId }),
  });

  return handleResponse<SessionResponse>(response);
}

export async function getSession(
  token: string,
  id: string
): Promise<SessionResponse> {
  const response = await fetch(`${API_URL}/sessions/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<SessionResponse>(response);
}

export async function getActiveSession(
  token: string
): Promise<{ data: WorkoutSession | null }> {
  const response = await fetch(`${API_URL}/sessions/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<{ data: WorkoutSession | null }>(response);
}

export async function getLastSession(
  token: string,
  workoutId: string
): Promise<{ data: WorkoutSession | null }> {
  const response = await fetch(`${API_URL}/sessions/last?workoutId=${workoutId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<{ data: WorkoutSession | null }>(response);
}

export async function getSessions(
  token: string,
  params?: {
    status?: SessionStatus;
    workoutId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<SessionListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.workoutId) searchParams.set("workoutId", params.workoutId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  const queryString = searchParams.toString();
  const url = `${API_URL}/sessions${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<SessionListResponse>(response);
}

export async function updateSession(
  token: string,
  id: string,
  data: { status?: "completed" | "abandoned"; notes?: string }
): Promise<{ data: WorkoutSession }> {
  const response = await fetch(`${API_URL}/sessions/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<{ data: WorkoutSession }>(response);
}

export async function deleteSession(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_URL}/sessions/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<void>(response);
}

// Exercise endpoints
export async function skipExercise(
  token: string,
  sessionId: string,
  exerciseId: string
): Promise<{ data: SessionExercise }> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/exercises/${exerciseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "skipped" }),
  });

  return handleResponse<{ data: SessionExercise }>(response);
}

export async function substituteExercise(
  token: string,
  sessionId: string,
  exerciseId: string,
  newExerciseId: string
): Promise<{ data: SessionExercise }> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/exercises/${exerciseId}/substitute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newExerciseId }),
  });

  return handleResponse<{ data: SessionExercise }>(response);
}

export async function reorderExercises(
  token: string,
  sessionId: string,
  exerciseIds: string[]
): Promise<{ data: SessionExercise[] }> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/exercises/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ exerciseIds }),
  });

  return handleResponse<{ data: SessionExercise[] }>(response);
}

export async function replaceSuperset(
  token: string,
  sessionId: string,
  workoutItemId: string,
  exerciseIds: string[]
): Promise<{ data: SessionExercise[] }> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/superset/${workoutItemId}/replace`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ exerciseIds }),
  });

  return handleResponse<{ data: SessionExercise[] }>(response);
}

// Set endpoints
export async function recordSetResult(
  token: string,
  sessionId: string,
  exerciseId: string,
  data: {
    setNumber: number;
    actualReps: number;
    actualWeight: number;
    rpe?: number;
  }
): Promise<{ data: SessionSet }> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/exercises/${exerciseId}/sets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<{ data: SessionSet }>(response);
}

export async function updateSet(
  token: string,
  sessionId: string,
  setId: string,
  data: {
    actualReps?: number;
    actualWeight?: number;
    rpe?: number | null;
  }
): Promise<{ data: SessionSet }> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/sets/${setId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<{ data: SessionSet }>(response);
}

export async function deleteSet(
  token: string,
  sessionId: string,
  setId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/sets/${setId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<void>(response);
}
