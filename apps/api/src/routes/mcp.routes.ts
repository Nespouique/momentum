import express, { Router, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpAuthMiddleware, type McpRequest } from "../middleware/mcp-auth.middleware.js";
import type { McpConfig } from "../mcp/config.js";
import { createMcpServer } from "../mcp/server.js";
import { createMcpOAuthRouter } from "./mcp-oauth.routes.js";
import { corsForMcp } from "./mcp.cors.js";

function jsonRpcError(res: Response, status: number, code: number, message: string) {
  return res.status(status).json({ jsonrpc: "2.0", error: { code, message }, id: null });
}

// Stateless Streamable HTTP: a fresh server + transport per request, authenticated by bearer token.
// The MCP session id (unused here) is never treated as authentication.
export function createMcpRouter(config: McpConfig): Router {
  const router = Router();
  const cors = corsForMcp();
  const auth = createMcpAuthMiddleware(config);

  router.use(["/mcp", "/oauth", "/.well-known"], (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  });
  router.use(createMcpOAuthRouter(config));
  router.options("/mcp", cors);

  router.post(
    "/mcp",
    cors,
    auth,
    express.json({ limit: "1mb" }),
    async (req: McpRequest, res: Response) => {
      const identity = req.mcpAuth;
      if (!identity) return jsonRpcError(res, 401, -32001, "Unauthorized");

      const server = createMcpServer({
        userId: identity.userId,
        connectionId: identity.connectionId,
        config,
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });

      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("MCP request error:", error);
        if (!res.headersSent) jsonRpcError(res, 500, -32603, "Internal server error");
      }
    }
  );

  const methodNotAllowed = (_req: McpRequest, res: Response) => {
    res.setHeader("Allow", "POST, OPTIONS");
    return jsonRpcError(res, 405, -32000, "Method not allowed. Use POST.");
  };
  router.get("/mcp", cors, auth, methodNotAllowed);
  router.delete("/mcp", cors, auth, methodNotAllowed);

  return router;
}
