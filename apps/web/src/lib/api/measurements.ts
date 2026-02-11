const API_URL = "/backend";

export interface Measurement {
  id: string;
  userId: string;
  date: string;
  weight: number | null;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  bicepsLeft: number | null;
  bicepsRight: number | null;
  forearmLeft: number | null;
  forearmRight: number | null;
  wristLeft: number | null;
  wristRight: number | null;
  waist: number | null;
  hips: number | null;
  thighLeft: number | null;
  thighRight: number | null;
  calfLeft: number | null;
  calfRight: number | null;
  ankleLeft: number | null;
  ankleRight: number | null;
  notes: string | null;
  createdAt: string;
}

export interface MeasurementInput {
  date: string;
  weight?: number | null;
  neck?: number | null;
  shoulders?: number | null;
  chest?: number | null;
  bicepsLeft?: number | null;
  bicepsRight?: number | null;
  forearmLeft?: number | null;
  forearmRight?: number | null;
  wristLeft?: number | null;
  wristRight?: number | null;
  waist?: number | null;
  hips?: number | null;
  thighLeft?: number | null;
  thighRight?: number | null;
  calfLeft?: number | null;
  calfRight?: number | null;
  ankleLeft?: number | null;
  ankleRight?: number | null;
  notes?: string | null;
}

export interface MeasurementListResponse {
  data: Measurement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProgressResponse {
  field: string;
  period: string;
  data: Array<{ date: string; value: number }>;
  change: number | null;
  changePercent: number | null;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/** Returns true if the measurement has at least one body field (not just weight) */
export function hasBodyMeasurements(m: Measurement): boolean {
  return (
    m.neck !== null ||
    m.shoulders !== null ||
    m.chest !== null ||
    m.waist !== null ||
    m.hips !== null ||
    m.bicepsLeft !== null ||
    m.bicepsRight !== null ||
    m.forearmLeft !== null ||
    m.forearmRight !== null ||
    m.wristLeft !== null ||
    m.wristRight !== null ||
    m.thighLeft !== null ||
    m.thighRight !== null ||
    m.calfLeft !== null ||
    m.calfRight !== null ||
    m.ankleLeft !== null ||
    m.ankleRight !== null
  );
}

export class MeasurementError extends Error {
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
    this.name = "MeasurementError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new MeasurementError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.details
    );
  }

  return data as T;
}

export async function getMeasurements(
  token: string,
  page = 1,
  limit = 20
): Promise<MeasurementListResponse> {
  const response = await fetch(
    `${API_URL}/measurements?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse<MeasurementListResponse>(response);
}

export async function getMeasurement(
  token: string,
  id: string
): Promise<Measurement> {
  const response = await fetch(`${API_URL}/measurements/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<Measurement>(response);
}

export async function getLatestMeasurement(
  token: string
): Promise<Measurement | null> {
  try {
    const response = await fetch(`${API_URL}/measurements/latest`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    return handleResponse<Measurement>(response);
  } catch (error) {
    if (error instanceof MeasurementError && error.code === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export async function getMeasurementProgress(
  token: string,
  field: string,
  period = "3months"
): Promise<ProgressResponse> {
  const response = await fetch(
    `${API_URL}/measurements/progress?field=${field}&period=${period}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse<ProgressResponse>(response);
}

export async function createMeasurement(
  token: string,
  data: MeasurementInput
): Promise<Measurement> {
  const response = await fetch(`${API_URL}/measurements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Measurement>(response);
}

export async function updateMeasurement(
  token: string,
  id: string,
  data: Partial<MeasurementInput>
): Promise<Measurement> {
  const response = await fetch(`${API_URL}/measurements/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Measurement>(response);
}

export async function deleteMeasurement(
  token: string,
  id: string
): Promise<void> {
  const response = await fetch(`${API_URL}/measurements/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<void>(response);
}
