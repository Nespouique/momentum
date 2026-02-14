const API_URL = "/backend";

export interface TrackableGoal {
  id: string;
  trackableId: string;
  targetValue: number;
  frequency: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface Trackable {
  id: string;
  name: string;
  icon: string;
  color: string;
  trackingType: "boolean" | "number" | "duration";
  unit: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  goal: TrackableGoal | null;
}

export interface TrackableListResponse {
  data: Trackable[];
}

export interface CreateTrackableInput {
  name: string;
  icon: string;
  color: string;
  trackingType: "boolean" | "number" | "duration";
  unit?: string;
}

export interface UpdateTrackableInput {
  name?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateGoalInput {
  targetValue: number;
  frequency: "daily" | "weekly" | "monthly";
}

export interface UpdateGoalInput {
  targetValue?: number;
  frequency?: "daily" | "weekly" | "monthly";
  endDate?: string;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class TrackableError extends Error {
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
    this.name = "TrackableError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new TrackableError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.details
    );
  }

  return data as T;
}

export async function getTrackables(token: string): Promise<TrackableListResponse> {
  const response = await fetch(`${API_URL}/trackables`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<TrackableListResponse>(response);
}

export async function createTrackable(
  token: string,
  data: CreateTrackableInput
): Promise<Trackable> {
  const response = await fetch(`${API_URL}/trackables`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Trackable>(response);
}

export async function updateTrackable(
  token: string,
  id: string,
  data: UpdateTrackableInput
): Promise<Trackable> {
  const response = await fetch(`${API_URL}/trackables/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Trackable>(response);
}

export async function deleteTrackable(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_URL}/trackables/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<void>(response);
}

export async function createGoal(
  token: string,
  trackableId: string,
  data: CreateGoalInput
): Promise<TrackableGoal> {
  const response = await fetch(`${API_URL}/trackables/${trackableId}/goals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<TrackableGoal>(response);
}

export async function updateGoal(
  token: string,
  trackableId: string,
  goalId: string,
  data: UpdateGoalInput
): Promise<TrackableGoal> {
  const response = await fetch(`${API_URL}/trackables/${trackableId}/goals/${goalId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<TrackableGoal>(response);
}

export interface SuggestIconsResponse {
  icons: string[];
  color: string;
}

export async function suggestIcons(
  token: string,
  name: string
): Promise<SuggestIconsResponse> {
  const response = await fetch(`${API_URL}/trackables/suggest-icons`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  return handleResponse<SuggestIconsResponse>(response);
}

export async function reorderTrackables(
  token: string,
  items: ReorderItem[]
): Promise<{ success: boolean; updated: number }> {
  const response = await fetch(`${API_URL}/trackables/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });

  return handleResponse<{ success: boolean; updated: number }>(response);
}
