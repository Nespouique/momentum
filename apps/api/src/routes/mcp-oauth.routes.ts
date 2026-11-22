import express, { Router, type Request, type Response } from "express";
import { z } from "zod";
import { MCP_SCOPE, type McpConfig } from "../mcp/config.js";
import { renderConsentPage, renderErrorPage } from "../mcp/consent-page.js";
import {
  OAuthError,
  authenticateUser,
  createTicket,
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  getClient,
  issueAuthorizationCode,
  readTicket,
  registerClient,
  revokeToken,
  type AuthorizationRequest,
} from "../mcp/oauth.service.js";
import { RateLimiter } from "../mcp/rate-limit.js";
import { isAllowedRedirectUri } from "../mcp/redirect-uri.js";
import { CODE_CHALLENGE_PATTERN } from "../mcp/tokens.js";
import { corsForMcp } from "./mcp.cors.js";

const registrationSchema = z.object({
  client_name: z.string().trim().max(100).optional(),
  redirect_uris: z.array(z.string()).min(1).max(10),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
  scope: z.string().optional(),
});

const authorizeQuerySchema = z.object({
  response_type: z.string(),
  client_id: z.string().min(1).max(100),
  redirect_uri: z.string().min(1).max(2048),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
  scope: z.string().max(500).optional(),
  state: z.string().max(2048).optional(),
  resource: z.string().max(2048).optional(),
});

const consentFormSchema = z.object({
  ticket: z.string().min(1).max(4096),
  action: z.enum(["approve", "deny"]),
  email: z.string().max(320).optional(),
  password: z.string().max(1024).optional(),
});

function oauthError(res: Response, code: string, description: string, status = 400) {
  return res.status(status).json({ error: code, error_description: description });
}

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

function sameResource(value: string, resourceUrl: string): boolean {
  return value.replace(/\/+$/, "") === resourceUrl.replace(/\/+$/, "");
}

function redirectWith(
  redirectUri: string,
  params: Record<string, string | undefined>,
  config: McpConfig
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  url.searchParams.set("iss", config.origin);
  return url.toString();
}

function pageSecurityHeaders(res: Response) {
  noStore(res);
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  // No form-action: the approved form legitimately redirects to the client's callback.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"
  );
}

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function basicClientId(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) return undefined;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const id = decoded.split(":")[0];
  return id ? decodeURIComponent(id) : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function createMcpOAuthRouter(config: McpConfig): Router {
  const router = Router();
  const registrationLimiter = new RateLimiter(20, 60 * 60 * 1000);
  const tokenLimiter = new RateLimiter(60, 60 * 1000);
  const loginIpLimiter = new RateLimiter(20, 15 * 60 * 1000);
  const loginEmailLimiter = new RateLimiter(8, 15 * 60 * 1000);
  const form = express.urlencoded({ extended: false, limit: "16kb" });
  const json = express.json({ limit: "64kb" });
  const cors = corsForMcp();

  const metadata = {
    issuer: config.origin,
    authorization_endpoint: `${config.origin}/oauth/authorize`,
    token_endpoint: `${config.origin}/oauth/token`,
    registration_endpoint: `${config.origin}/oauth/register`,
    revocation_endpoint: `${config.origin}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [MCP_SCOPE],
    authorization_response_iss_parameter_supported: true,
  };

  const protectedResource = {
    resource: config.resourceUrl,
    authorization_servers: [config.origin],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Momentum",
  };

  router.options(
    [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
      "/.well-known/oauth-authorization-server",
      "/oauth/register",
      "/oauth/token",
      "/oauth/revoke",
    ],
    cors
  );
  router.get(
    ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"],
    cors,
    (_req, res) => res.json(protectedResource)
  );
  router.get("/.well-known/oauth-authorization-server", cors, (_req, res) => res.json(metadata));

  router.post("/oauth/register", cors, json, async (req: Request, res: Response) => {
    noStore(res);
    if (!registrationLimiter.check(clientIp(req)).allowed) {
      return oauthError(
        res,
        "temporarily_unavailable",
        "Too many registrations. Try again later.",
        429
      );
    }
    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return oauthError(
        res,
        "invalid_client_metadata",
        "redirect_uris is required (1 to 10 URIs)."
      );
    }
    const {
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      client_name: clientName,
    } = parsed.data;
    if (!redirectUris.every(isAllowedRedirectUri)) {
      return oauthError(
        res,
        "invalid_redirect_uri",
        "Redirect URIs must be https, loopback http or custom-scheme URIs without fragment."
      );
    }
    if (
      grantTypes &&
      !grantTypes.every((type) => ["authorization_code", "refresh_token"].includes(type))
    ) {
      return oauthError(res, "invalid_client_metadata", "Unsupported grant_types.");
    }
    try {
      const client = await registerClient({
        name: clientName || "Client MCP",
        redirectUris: [...new Set(redirectUris)],
      });
      return res.status(201).json({
        client_id: client.id,
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
        client_name: client.name,
        redirect_uris: client.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: MCP_SCOPE,
      });
    } catch (error) {
      console.error("MCP client registration error:", error);
      return oauthError(res, "server_error", "Registration failed.", 500);
    }
  });

  router.get("/oauth/authorize", async (req: Request, res: Response) => {
    pageSecurityHeaders(res);
    const parsed = authorizeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).send(renderErrorPage("Requête d'autorisation invalide."));
    }
    const query = parsed.data;

    const client = await getClient(query.client_id);
    if (!client || !client.redirectUris.includes(query.redirect_uri)) {
      return res
        .status(400)
        .send(renderErrorPage("Application inconnue ou adresse de retour non autorisée."));
    }

    const fail = (error: string, description: string) =>
      res.redirect(
        302,
        redirectWith(
          query.redirect_uri,
          { error, error_description: description, state: query.state },
          config
        )
      );

    if (query.response_type !== "code")
      return fail("unsupported_response_type", "Only response_type=code is supported.");
    if (
      !query.code_challenge ||
      !CODE_CHALLENGE_PATTERN.test(query.code_challenge) ||
      query.code_challenge_method !== "S256"
    ) {
      return fail("invalid_request", "PKCE with code_challenge_method=S256 is required.");
    }
    if (query.resource && !sameResource(query.resource, config.resourceUrl)) {
      return fail("invalid_target", "Unknown resource.");
    }

    const request: AuthorizationRequest = {
      clientId: client.id,
      redirectUri: query.redirect_uri,
      codeChallenge: query.code_challenge,
      // Only one read-only scope exists; unknown scopes are ignored and the granted scope is returned.
      scope: MCP_SCOPE,
      state: query.state,
    };
    return res.send(
      renderConsentPage({
        clientName: client.name,
        redirectTarget: new URL(query.redirect_uri).host || new URL(query.redirect_uri).protocol,
        ticket: createTicket(request),
      })
    );
  });

  router.post("/oauth/authorize", form, async (req: Request, res: Response) => {
    pageSecurityHeaders(res);
    const parsed = consentFormSchema.safeParse(req.body);
    const request = parsed.success ? readTicket(parsed.data.ticket) : null;
    if (!parsed.success || !request) {
      return res
        .status(400)
        .send(
          renderErrorPage(
            "Session d'autorisation expirée. Relancez la connexion depuis votre application."
          )
        );
    }
    const client = await getClient(request.clientId);
    if (!client || !client.redirectUris.includes(request.redirectUri)) {
      return res
        .status(400)
        .send(renderErrorPage("Application inconnue ou adresse de retour non autorisée."));
    }
    const target = new URL(request.redirectUri);
    const rerender = (message: string, status = 200) =>
      res.status(status).send(
        renderConsentPage({
          clientName: client.name,
          redirectTarget: target.host || target.protocol,
          ticket: parsed.data.ticket,
          error: message,
          email: parsed.data.email,
        })
      );

    if (parsed.data.action === "deny") {
      return res.redirect(
        302,
        redirectWith(
          request.redirectUri,
          {
            error: "access_denied",
            error_description: "The user denied the request.",
            state: request.state,
          },
          config
        )
      );
    }

    const email = (parsed.data.email ?? "").trim();
    const password = parsed.data.password ?? "";
    if (!email || !password) return rerender("Renseignez votre email et votre mot de passe.");

    const ipCheck = loginIpLimiter.check(clientIp(req));
    const emailCheck = loginEmailLimiter.check(email.toLowerCase());
    if (!ipCheck.allowed || !emailCheck.allowed) {
      const minutes = Math.ceil(
        Math.max(ipCheck.retryAfterSeconds, emailCheck.retryAfterSeconds) / 60
      );
      res.setHeader("Retry-After", String(minutes * 60));
      return rerender(`Trop de tentatives. Réessayez dans ${minutes} minute(s).`, 429);
    }

    try {
      const user = await authenticateUser(email, password);
      if (!user) return rerender("Email ou mot de passe incorrect.", 401);
      loginEmailLimiter.reset(email.toLowerCase());
      const code = await issueAuthorizationCode(request, user.id);
      return res.redirect(
        302,
        redirectWith(request.redirectUri, { code, state: request.state }, config)
      );
    } catch (error) {
      console.error("MCP authorization error:", error);
      return rerender("Une erreur est survenue. Réessayez.", 500);
    }
  });

  router.post("/oauth/token", cors, form, json, async (req: Request, res: Response) => {
    noStore(res);
    if (!tokenLimiter.check(clientIp(req)).allowed) {
      return oauthError(res, "temporarily_unavailable", "Too many requests.", 429);
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const clientId = str(body["client_id"]) ?? basicClientId(req);
    if (!clientId || !(await getClient(clientId))) {
      return oauthError(res, "invalid_client", "Unknown client.", 401);
    }
    const resource = str(body["resource"]);
    if (resource && !sameResource(resource, config.resourceUrl)) {
      return oauthError(res, "invalid_target", "Unknown resource.");
    }

    try {
      const grantType = str(body["grant_type"]);
      if (grantType === "authorization_code") {
        const code = str(body["code"]);
        const redirectUri = str(body["redirect_uri"]);
        const codeVerifier = str(body["code_verifier"]);
        if (!code || !redirectUri || !codeVerifier) {
          return oauthError(
            res,
            "invalid_request",
            "code, redirect_uri and code_verifier are required."
          );
        }
        return res.json(
          await exchangeAuthorizationCode({ clientId, code, redirectUri, codeVerifier })
        );
      }
      if (grantType === "refresh_token") {
        const refreshToken = str(body["refresh_token"]);
        if (!refreshToken) return oauthError(res, "invalid_request", "refresh_token is required.");
        return res.json(await exchangeRefreshToken({ clientId, refreshToken }));
      }
      return oauthError(res, "unsupported_grant_type", "Use authorization_code or refresh_token.");
    } catch (error) {
      if (error instanceof OAuthError)
        return oauthError(res, error.code, error.message, error.status);
      console.error("MCP token endpoint error:", error);
      return oauthError(res, "server_error", "Token request failed.", 500);
    }
  });

  router.post("/oauth/revoke", cors, form, json, async (req: Request, res: Response) => {
    noStore(res);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const token = str(body["token"]);
    if (!token) return oauthError(res, "invalid_request", "token is required.");
    try {
      await revokeToken(token, str(body["client_id"]) ?? basicClientId(req));
    } catch (error) {
      console.error("MCP revoke error:", error);
    }
    return res.status(200).json({});
  });

  return router;
}
