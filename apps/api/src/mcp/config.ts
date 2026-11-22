export const MCP_SCOPE = "momentum:read";
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const AUTHORIZATION_CODE_TTL_SECONDS = 5 * 60;
export const AUTHORIZATION_TICKET_TTL_SECONDS = 10 * 60;
export const DEFAULT_TIMEZONE = "Europe/Paris";

export interface McpConfig {
  enabled: boolean;
  origin: string;
  resourceUrl: string;
  resourceMetadataUrl: string;
  defaultTimezone: string;
}

// MCP_PUBLIC_URL is the public origin serving /mcp, /oauth/* and /.well-known/oauth-*.
// In production the feature stays disabled until it is configured explicitly.
export function getMcpConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const raw = env["MCP_PUBLIC_URL"]?.trim();
  const defaultTimezone = env["MCP_DEFAULT_TIMEZONE"]?.trim() || DEFAULT_TIMEZONE;
  const fallback =
    env["NODE_ENV"] === "production" ? undefined : `http://localhost:${env["PORT"] || 3001}`;
  const candidate = raw || fallback;

  let origin = "";
  if (candidate) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") origin = url.origin;
    } catch {
      origin = "";
    }
  }

  return {
    enabled: origin !== "",
    origin,
    resourceUrl: `${origin}/mcp`,
    resourceMetadataUrl: `${origin}/.well-known/oauth-protected-resource/mcp`,
    defaultTimezone,
  };
}
