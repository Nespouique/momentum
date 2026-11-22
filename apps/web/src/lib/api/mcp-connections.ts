const API_URL = "/backend";

export interface McpConnection {
  id: string;
  kind: "oauth" | "personal_token";
  label: string;
  clientName: string | null;
  scope: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  tokenPrefix: string | null;
}

export interface McpConnectionsResponse {
  enabled: boolean;
  mcpUrl: string | null;
  connections: McpConnection[];
}

export interface CreateMcpTokenInput {
  label: string;
  expiresInDays: 30 | 90 | 365 | null;
}

export interface CreateMcpTokenResponse {
  id: string;
  token: string;
  expiresAt: string | null;
  mcpUrl: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class McpConnectionsError extends Error {
  code: string;
  details?: Array<{ field: string; message: string }>;

  constructor(message: string, code: string, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "McpConnectionsError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new McpConnectionsError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.details
    );
  }

  return data as T;
}

export async function listMcpConnections(token: string): Promise<McpConnectionsResponse> {
  const response = await fetch(`${API_URL}/mcp-connections`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<McpConnectionsResponse>(response);
}

export async function createMcpToken(
  token: string,
  data: CreateMcpTokenInput
): Promise<CreateMcpTokenResponse> {
  const response = await fetch(`${API_URL}/mcp-connections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<CreateMcpTokenResponse>(response);
}

export async function revokeMcpConnection(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_URL}/mcp-connections/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<void>(response);
}
