const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const FORBIDDEN_SCHEMES = new Set([
  "javascript",
  "data",
  "file",
  "vbscript",
  "about",
  "blob",
  "ftp",
  "ws",
  "wss",
]);

// Accepts https URLs, loopback http URLs (native/CLI clients) and private-use schemes
// (desktop apps). Fragments and embedded credentials are never allowed.
export function isAllowedRedirectUri(raw: string): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return false;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.hash || raw.includes("#") || url.username || url.password) return false;

  const scheme = url.protocol.slice(0, -1).toLowerCase();
  if (scheme === "https") return url.hostname.length > 0;
  if (scheme === "http") return LOOPBACK_HOSTS.has(url.hostname);
  if (FORBIDDEN_SCHEMES.has(scheme)) return false;
  return /^[a-z][a-z0-9+.-]*$/.test(scheme);
}
