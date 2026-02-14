const API_URL = "/backend";

// Response types based on Story 3.3 API spec
export interface RingData {
  value: number;
  goal: number;
  percentage: number;
  trackableId: string;
}

export interface SleepData {
  value: number;
  goal: number | null;
  percentage: number | null;
  trackableId: string;
}

export interface TrackableEntry {
  id: string;
  value: number;
  source: "manual" | "health_connect";
}

export interface DashboardTrackable {
  id: string;
  name: string;
  icon: string;
  color: string;
  trackingType: "boolean" | "number" | "duration";
  unit: string | null;
  goal: {
    targetValue: number;
    frequency: "daily" | "weekly" | "monthly";
  } | null;
  entry: TrackableEntry | null;
  completed: boolean;
}

export interface WorkoutSessionsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  goal: {
    targetValue: number;
    frequency: "weekly" | "monthly";
  } | null;
}

export interface DailyProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface TodayResponse {
  date: string;
  rings: {
    steps: RingData;
    active: RingData;
    calories: RingData;
  };
  sleep: SleepData;
  trackables: DashboardTrackable[];
  workoutSessions: WorkoutSessionsSummary;
  progress: DailyProgress;
}

export interface RingsResponse {
  steps: RingData;
  active: RingData;
  calories: RingData;
}

export interface EntryInput {
  trackableId: string;
  date: string;
  value: number;
  notes?: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class TrackingError extends Error {
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
    this.name = "TrackingError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new TrackingError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.details
    );
  }

  return data as T;
}

export async function getToday(token: string): Promise<TodayResponse> {
  const response = await fetch(`${API_URL}/tracking/today`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<TodayResponse>(response);
}

export async function getRings(token: string): Promise<RingsResponse> {
  const response = await fetch(`${API_URL}/tracking/rings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<RingsResponse>(response);
}

export async function upsertEntry(
  token: string,
  data: EntryInput
): Promise<TrackableEntry> {
  const response = await fetch(`${API_URL}/tracking/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<TrackableEntry>(response);
}

export async function deleteEntry(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_URL}/tracking/entries/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<void>(response);
}
