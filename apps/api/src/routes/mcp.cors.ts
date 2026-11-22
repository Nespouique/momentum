import cors from "cors";

// MCP/OAuth endpoints are authenticated with bearer tokens, never cookies,
// so they can safely allow any origin (browser-based MCP clients and inspectors).
export function corsForMcp() {
  return cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Mcp-Protocol-Version",
      "Mcp-Session-Id",
      "Last-Event-ID",
    ],
    exposedHeaders: ["WWW-Authenticate", "Mcp-Session-Id"],
    maxAge: 86400,
  });
}
