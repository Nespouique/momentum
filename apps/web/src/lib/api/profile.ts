const API_URL = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  birthDate: string | null;
  height: number | null;
  goalDescription: string | null;
  createdAt: string;
}

export interface UpdateProfileData {
  name?: string;
  birthDate?: string | null;
  height?: number | null;
  goalDescription?: string | null;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

class ProfileError extends Error {
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
    this.name = "ProfileError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new ProfileError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.details
    );
  }

  return data as T;
}

export async function getProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<UserProfile>(response);
}

export async function updateProfile(
  token: string,
  data: UpdateProfileData
): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<UserProfile>(response);
}

export async function changePassword(
  token: string,
  data: ChangePasswordData
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/profile/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<{ message: string }>(response);
}
