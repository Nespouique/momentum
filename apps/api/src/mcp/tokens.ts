import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type McpTokenKind = "access" | "refresh" | "personal";

const TOKEN_PREFIXES: Record<McpTokenKind, string> = {
  access: "mat_",
  refresh: "mrt_",
  personal: "mpt_",
};

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateOpaqueToken(kind: McpTokenKind): {
  token: string;
  hash: string;
  prefix: string;
} {
  const token = `${TOKEN_PREFIXES[kind]}${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashSecret(token), prefix: token.slice(0, 8) };
}

export function generateAuthorizationCode(): { code: string; hash: string } {
  const code = randomBytes(32).toString("base64url");
  return { code, hash: hashSecret(code) };
}

const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
export const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  if (!CODE_VERIFIER_PATTERN.test(codeVerifier)) return false;
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && timingSafeEqual(a, b);
}
