import { createHmac } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { comparePassword } from "../services/auth.service.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTHORIZATION_CODE_TTL_SECONDS,
  AUTHORIZATION_TICKET_TTL_SECONDS,
  MCP_SCOPE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./config.js";
import {
  generateAuthorizationCode,
  generateOpaqueToken,
  hashSecret,
  verifyPkceS256,
} from "./tokens.js";

export class OAuthError extends Error {
  constructor(
    readonly code: string,
    description: string,
    readonly status: number = 400
  ) {
    super(description);
  }
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  state: string | undefined;
}

const TICKET_AUDIENCE = "mcp-authorize";
const MAX_PERSONAL_TOKENS = 20;
const CLIENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const REVOKED_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

// Derived so that an authorization ticket can never verify as a regular API JWT.
function ticketSecret(): string {
  return createHmac("sha256", process.env["JWT_SECRET"] || "development-secret-key")
    .update("momentum-mcp-authorization-ticket")
    .digest("hex");
}

export function createTicket(request: AuthorizationRequest): string {
  return jwt.sign(
    {
      cid: request.clientId,
      ru: request.redirectUri,
      cc: request.codeChallenge,
      sc: request.scope,
      st: request.state,
    },
    ticketSecret(),
    { expiresIn: AUTHORIZATION_TICKET_TTL_SECONDS, audience: TICKET_AUDIENCE }
  );
}

export function readTicket(ticket: string): AuthorizationRequest | null {
  try {
    const payload = jwt.verify(ticket, ticketSecret(), { audience: TICKET_AUDIENCE }) as {
      cid?: string;
      ru?: string;
      cc?: string;
      sc?: string;
      st?: string;
    };
    if (!payload.cid || !payload.ru || !payload.cc || !payload.sc) return null;
    return {
      clientId: payload.cid,
      redirectUri: payload.ru,
      codeChallenge: payload.cc,
      scope: payload.sc,
      state: payload.st,
    };
  } catch {
    return null;
  }
}

export async function registerClient(input: { name: string; redirectUris: string[] }) {
  const client = await prisma.mcpClient.create({
    data: { name: input.name, redirectUris: input.redirectUris },
  });
  void pruneExpired();
  return client;
}

export async function getClient(clientId: string) {
  return prisma.mcpClient.findUnique({ where: { id: clientId } });
}

let dummyHash: string | null = null;

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
    await comparePassword(password, dummyHash);
    return null;
  }
  return (await comparePassword(password, user.passwordHash))
    ? { id: user.id, email: user.email }
    : null;
}

export async function issueAuthorizationCode(
  request: AuthorizationRequest,
  userId: string
): Promise<string> {
  const { code, hash } = generateAuthorizationCode();
  await prisma.mcpAuthorizationCode.create({
    data: {
      codeHash: hash,
      clientId: request.clientId,
      userId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      scope: request.scope,
      expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_SECONDS * 1000),
    },
  });
  return code;
}

async function revokeConnectionById(connectionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.mcpConnection.updateMany({
      where: { id: connectionId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.mcpToken.deleteMany({ where: { connectionId } }),
  ]);
}

async function issueTokenPair(connectionId: string, scope: string): Promise<TokenResponse> {
  const access = generateOpaqueToken("access");
  const refresh = generateOpaqueToken("refresh");
  const now = Date.now();
  await prisma.mcpToken.createMany({
    data: [
      {
        connectionId,
        kind: "access",
        tokenHash: access.hash,
        tokenPrefix: access.prefix,
        expiresAt: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000),
      },
      {
        connectionId,
        kind: "refresh",
        tokenHash: refresh.hash,
        tokenPrefix: refresh.prefix,
        expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    ],
  });
  return {
    access_token: access.token,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refresh.token,
    scope,
  };
}

export async function exchangeAuthorizationCode(input: {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const invalid = () =>
    new OAuthError("invalid_grant", "Invalid, expired or already used authorization code.");
  const record = await prisma.mcpAuthorizationCode.findUnique({
    where: { codeHash: hashSecret(input.code) },
    include: { client: true },
  });
  if (!record) throw invalid();

  if (record.usedAt) {
    if (record.connectionId) await revokeConnectionById(record.connectionId);
    throw invalid();
  }
  if (
    record.expiresAt.getTime() < Date.now() ||
    record.clientId !== input.clientId ||
    record.redirectUri !== input.redirectUri ||
    !verifyPkceS256(input.codeVerifier, record.codeChallenge)
  ) {
    throw invalid();
  }

  const claimed = await prisma.mcpAuthorizationCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw invalid();

  // Re-authorizing the same client replaces its previous grant instead of piling up connections.
  const existing = await prisma.mcpConnection.findFirst({
    where: { userId: record.userId, clientId: record.clientId, kind: "oauth", revokedAt: null },
  });
  let connectionId: string;
  if (existing) {
    connectionId = existing.id;
    await prisma.mcpToken.deleteMany({ where: { connectionId } });
  } else {
    const created = await prisma.mcpConnection.create({
      data: {
        userId: record.userId,
        clientId: record.clientId,
        kind: "oauth",
        label: record.client.name,
        scope: record.scope,
      },
    });
    connectionId = created.id;
  }
  await prisma.mcpAuthorizationCode.update({ where: { id: record.id }, data: { connectionId } });
  return issueTokenPair(connectionId, record.scope);
}

export async function exchangeRefreshToken(input: {
  clientId: string;
  refreshToken: string;
}): Promise<TokenResponse> {
  const invalid = () => new OAuthError("invalid_grant", "Invalid or expired refresh token.");
  const token = await prisma.mcpToken.findUnique({
    where: { tokenHash: hashSecret(input.refreshToken) },
    include: { connection: true },
  });
  if (!token || token.kind !== "refresh") throw invalid();
  const { connection } = token;
  if (connection.revokedAt || connection.clientId !== input.clientId) throw invalid();

  if (token.usedAt) {
    // Rotated token presented again: treat the grant as compromised.
    await revokeConnectionById(connection.id);
    throw invalid();
  }
  if (token.expiresAt && token.expiresAt.getTime() < Date.now()) throw invalid();

  const claimed = await prisma.mcpToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw invalid();

  await prisma.mcpConnection.update({
    where: { id: connection.id },
    data: { lastUsedAt: new Date() },
  });
  return issueTokenPair(connection.id, connection.scope);
}

export async function revokeToken(rawToken: string, clientId?: string): Promise<void> {
  const token = await prisma.mcpToken.findUnique({
    where: { tokenHash: hashSecret(rawToken) },
    include: { connection: true },
  });
  if (!token) return;
  if (clientId && token.connection.clientId !== clientId) return;
  await revokeConnectionById(token.connectionId);
}

export interface BearerIdentity {
  userId: string;
  connectionId: string;
  kind: string;
  scope: string;
}

const LAST_USED_THROTTLE_MS = 60_000;

export async function authenticateBearer(rawToken: string): Promise<BearerIdentity | null> {
  const token = await prisma.mcpToken.findUnique({
    where: { tokenHash: hashSecret(rawToken) },
    include: { connection: true },
  });
  if (!token || (token.kind !== "access" && token.kind !== "personal")) return null;
  if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) return null;
  const { connection } = token;
  if (connection.revokedAt) return null;
  if (!connection.scope.split(" ").includes(MCP_SCOPE)) return null;

  const lastUsed = connection.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - lastUsed > LAST_USED_THROTTLE_MS) {
    void prisma.mcpConnection
      .update({ where: { id: connection.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }
  return {
    userId: connection.userId,
    connectionId: connection.id,
    kind: connection.kind,
    scope: connection.scope,
  };
}

export async function createPersonalToken(
  userId: string,
  input: { label: string; expiresInDays: number | null }
): Promise<{ id: string; token: string; expiresAt: Date | null }> {
  const active = await prisma.mcpConnection.count({
    where: { userId, kind: "personal_token", revokedAt: null },
  });
  if (active >= MAX_PERSONAL_TOKENS) {
    throw new OAuthError("too_many_tokens", "Too many active personal tokens.", 409);
  }
  const { token, hash, prefix } = generateOpaqueToken("personal");
  const expiresAt =
    input.expiresInDays === null ? null : new Date(Date.now() + input.expiresInDays * 86_400_000);
  const connection = await prisma.mcpConnection.create({
    data: {
      userId,
      kind: "personal_token",
      label: input.label,
      tokens: { create: { kind: "personal", tokenHash: hash, tokenPrefix: prefix, expiresAt } },
    },
  });
  return { id: connection.id, token, expiresAt };
}

export async function listConnections(userId: string) {
  const connections = await prisma.mcpConnection.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      tokens: {
        where: { kind: { in: ["personal", "refresh"] } },
        select: { kind: true, tokenPrefix: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return connections.map((connection) => ({
    id: connection.id,
    kind: connection.kind,
    label: connection.label,
    clientName: connection.client?.name ?? null,
    scope: connection.scope,
    createdAt: connection.createdAt.toISOString(),
    lastUsedAt: connection.lastUsedAt?.toISOString() ?? null,
    expiresAt: connection.tokens[0]?.expiresAt?.toISOString() ?? null,
    tokenPrefix:
      connection.kind === "personal_token" ? (connection.tokens[0]?.tokenPrefix ?? null) : null,
  }));
}

export async function revokeConnection(userId: string, connectionId: string): Promise<boolean> {
  const result = await prisma.mcpConnection.updateMany({
    where: { id: connectionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return false;
  await prisma.mcpToken.deleteMany({ where: { connectionId } });
  return true;
}

let lastPrune = 0;

export async function pruneExpired(now: number = Date.now()): Promise<void> {
  if (now - lastPrune < 60 * 60 * 1000) return;
  lastPrune = now;
  try {
    await prisma.$transaction([
      prisma.mcpAuthorizationCode.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
      prisma.mcpToken.deleteMany({
        where: { expiresAt: { lt: new Date(now) }, kind: { in: ["access", "refresh"] } },
      }),
      prisma.mcpConnection.deleteMany({
        where: { revokedAt: { lt: new Date(now - REVOKED_RETENTION_MS) } },
      }),
      prisma.mcpClient.deleteMany({
        where: {
          createdAt: { lt: new Date(now - CLIENT_RETENTION_MS) },
          connections: { none: {} },
        },
      }),
    ]);
  } catch (error) {
    console.error("MCP prune failed:", error);
  }
}
