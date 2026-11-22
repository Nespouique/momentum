import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { getMcpConfig } from "../src/mcp/config.js";
import { createTicket, readTicket } from "../src/mcp/oauth.service.js";
import { RateLimiter } from "../src/mcp/rate-limit.js";
import { isAllowedRedirectUri } from "../src/mcp/redirect-uri.js";
import { generateOpaqueToken, hashSecret, verifyPkceS256 } from "../src/mcp/tokens.js";
import { verifyToken } from "../src/services/auth.service.js";

describe("PKCE", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  it("accepts the matching S256 verifier only", () => {
    assert.equal(verifyPkceS256(verifier, challenge), true);
    assert.equal(verifyPkceS256(`${verifier}x`, challenge), false);
    assert.equal(verifyPkceS256("short", challenge), false);
    assert.equal(verifyPkceS256(challenge, challenge), false);
  });
});

describe("redirect URIs", () => {
  it("accepts https, loopback http and custom schemes", () => {
    for (const uri of [
      "https://claude.ai/api/mcp/auth_callback",
      "https://chatgpt.com/connector_platform_oauth_redirect",
      "http://localhost:3118/callback",
      "http://127.0.0.1:19876/mcp/oauth/callback",
      "http://[::1]:8080/cb",
      "cursor://anysphere.cursor-retrieval/oauth/callback",
    ]) {
      assert.equal(isAllowedRedirectUri(uri), true, uri);
    }
  });

  it("rejects unsafe or malformed URIs", () => {
    for (const uri of [
      "http://evil.example/cb",
      "https://example.com/cb#frag",
      "https://user:pass@example.com/cb",
      "javascript:alert(1)",
      "data:text/html,x",
      "file:///etc/passwd",
      "not a url",
      "",
    ]) {
      assert.equal(isAllowedRedirectUri(uri), false, uri);
    }
  });
});

describe("tokens", () => {
  it("generates distinct prefixed tokens and stores only hashes", () => {
    const a = generateOpaqueToken("access");
    const b = generateOpaqueToken("personal");
    assert.ok(a.token.startsWith("mat_"));
    assert.ok(b.token.startsWith("mpt_"));
    assert.notEqual(a.token, generateOpaqueToken("access").token);
    assert.equal(a.hash, hashSecret(a.token));
    assert.notEqual(a.hash, a.token);
  });
});

describe("authorization ticket", () => {
  const request = {
    clientId: "client-1",
    redirectUri: "https://example.com/cb",
    codeChallenge: "c".repeat(43),
    scope: "momentum:read",
    state: "xyz",
  };

  it("round-trips", () => {
    assert.deepEqual(readTicket(createTicket(request)), request);
  });

  it("is not a valid API JWT and rejects tampering", () => {
    const ticket = createTicket(request);
    assert.equal(verifyToken(ticket), null);
    assert.equal(readTicket(`${ticket}x`), null);
    const forged = jwt.sign(
      { cid: "c", ru: "https://evil", cc: "x", sc: "momentum:read" },
      "development-secret-key",
      {
        audience: "mcp-authorize",
      }
    );
    assert.equal(readTicket(forged), null);
  });
});

describe("RateLimiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    const limiter = new RateLimiter(2, 1000);
    assert.equal(limiter.check("k", 0).allowed, true);
    assert.equal(limiter.check("k", 1).allowed, true);
    const blocked = limiter.check("k", 2);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
    assert.equal(limiter.check("other", 3).allowed, true);
    assert.equal(limiter.check("k", 1001).allowed, true);
  });
});

describe("getMcpConfig", () => {
  it("stays disabled in production until MCP_PUBLIC_URL is set", () => {
    assert.equal(getMcpConfig({ NODE_ENV: "production" }).enabled, false);
    const config = getMcpConfig({
      NODE_ENV: "production",
      MCP_PUBLIC_URL: "https://mcp.example.com/",
    });
    assert.equal(config.enabled, true);
    assert.equal(config.resourceUrl, "https://mcp.example.com/mcp");
    assert.equal(
      config.resourceMetadataUrl,
      "https://mcp.example.com/.well-known/oauth-protected-resource/mcp"
    );
  });

  it("defaults to localhost outside production and rejects invalid URLs", () => {
    assert.equal(getMcpConfig({ PORT: "3001" }).origin, "http://localhost:3001");
    assert.equal(getMcpConfig({ MCP_PUBLIC_URL: "ftp://x" }).enabled, false);
  });
});
