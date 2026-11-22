import { Router, Response } from "express";
import { ZodError } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import { getMcpConfig } from "../mcp/config.js";
import {
  OAuthError,
  createPersonalToken,
  listConnections,
  revokeConnection,
} from "../mcp/oauth.service.js";
import { createMcpTokenSchema } from "../schemas/mcp-connection.schema.js";

const router = Router();

const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MCP_NOT_CONFIGURED: "MCP_NOT_CONFIGURED",
  TOO_MANY_TOKENS: "TOO_MANY_TOKENS",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function internalError(res: Response, context: string, error: unknown) {
  console.error(context, error);
  return res.status(500).json({
    error: { code: ErrorCodes.INTERNAL_ERROR, message: "An unexpected error occurred" },
  });
}

router.use(authMiddleware);

// GET /mcp-connections - Active MCP connections and personal tokens of the user
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const config = getMcpConfig();
    const connections = await listConnections(req.userId!);
    return res.json({
      enabled: config.enabled,
      mcpUrl: config.enabled ? config.resourceUrl : null,
      connections,
    });
  } catch (error) {
    return internalError(res, "List MCP connections error:", error);
  }
});

// POST /mcp-connections - Create a personal access token (shown once)
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const config = getMcpConfig();
    if (!config.enabled) {
      return res.status(503).json({
        error: {
          code: ErrorCodes.MCP_NOT_CONFIGURED,
          message: "MCP server is not configured (MCP_PUBLIC_URL is missing)",
        },
      });
    }
    const data = createMcpTokenSchema.parse(req.body);
    const created = await createPersonalToken(req.userId!, {
      label: data.label,
      expiresInDays: data.expiresInDays,
    });
    return res.status(201).json({
      id: created.id,
      token: created.token,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      mcpUrl: config.resourceUrl,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Validation failed",
          details: formatZodError(error),
        },
      });
    }
    if (error instanceof OAuthError && error.code === "too_many_tokens") {
      return res.status(409).json({
        error: { code: ErrorCodes.TOO_MANY_TOKENS, message: "Too many active personal tokens" },
      });
    }
    return internalError(res, "Create MCP token error:", error);
  }
});

// DELETE /mcp-connections/:id - Revoke a connection (effective immediately)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const revoked = await revokeConnection(req.userId!, String(req.params["id"]));
    if (!revoked) {
      return res.status(404).json({
        error: { code: ErrorCodes.NOT_FOUND, message: "Connection not found" },
      });
    }
    return res.status(204).send();
  } catch (error) {
    return internalError(res, "Revoke MCP connection error:", error);
  }
});

export default router;
