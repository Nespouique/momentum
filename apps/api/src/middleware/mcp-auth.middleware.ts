import type { NextFunction, Request, RequestHandler, Response } from "express";
import { MCP_SCOPE, type McpConfig } from "../mcp/config.js";
import { authenticateBearer, type BearerIdentity } from "../mcp/oauth.service.js";
import { RateLimiter } from "../mcp/rate-limit.js";

export interface McpRequest extends Request {
  mcpAuth?: BearerIdentity;
}

function challenge(config: McpConfig, error?: string, description?: string): string {
  const parts = [`resource_metadata="${config.resourceMetadataUrl}"`, `scope="${MCP_SCOPE}"`];
  if (error) parts.push(`error="${error}"`);
  if (description) parts.push(`error_description="${description}"`);
  return `Bearer ${parts.join(", ")}`;
}

export function createMcpAuthMiddleware(
  config: McpConfig,
  limiter: RateLimiter = new RateLimiter(120, 60_000)
): RequestHandler {
  return async (req: McpRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !/^Bearer\s+\S+$/i.test(header)) {
      res.setHeader("WWW-Authenticate", challenge(config));
      return res
        .status(401)
        .json({ error: "unauthorized", error_description: "Authentication required." });
    }

    try {
      const identity = await authenticateBearer(header.replace(/^Bearer\s+/i, ""));
      if (!identity) {
        res.setHeader(
          "WWW-Authenticate",
          challenge(config, "invalid_token", "Invalid, expired or revoked token.")
        );
        return res
          .status(401)
          .json({
            error: "invalid_token",
            error_description: "Invalid, expired or revoked token.",
          });
      }

      const rate = limiter.check(identity.connectionId);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res
          .status(429)
          .json({ error: "rate_limited", error_description: "Too many requests." });
      }

      req.mcpAuth = identity;
      return next();
    } catch (error) {
      console.error("MCP authentication error:", error);
      return res.status(500).json({ error: "server_error" });
    }
  };
}
