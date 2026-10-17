/**
 * Simple shared-passcode admin protection (hackathon-grade, not user accounts).
 * Uses only Web Crypto so it also runs in the Edge middleware.
 *
 * Modes:
 *  - enabled:  ADMIN_PASSCODE is set -> admin pages/APIs need a signed session cookie
 *  - open-dev: no passcode, development -> admin is OPEN (a warning is shown in the UI)
 *  - locked:   no passcode, production  -> admin is DISABLED until a passcode is set
 */
export const ADMIN_COOKIE = "cf_admin";
export const SESSION_SECONDS = 8 * 60 * 60;

export type AuthMode = "enabled" | "open-dev" | "locked";

const enc = new TextEncoder();

export function getAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE ?? "").trim();
}

export function getAuthMode(): AuthMode {
  if (getAdminPasscode().length > 0) return "enabled";
  return process.env.NODE_ENV === "production" ? "locked" : "open-dev";
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the typed passcode equals ADMIN_PASSCODE (compares fixed-length hashes). */
export async function passcodeMatches(input: string): Promise<boolean> {
  const secret = getAdminPasscode();
  if (!secret) return false;
  const [a, b] = await Promise.all([hmacHex(input, "campusfix-compare"), hmacHex(secret, "campusfix-compare")]);
  return safeEqual(a, b);
}

export async function createSessionToken(now: number = Date.now()): Promise<string> {
  const expires = now + SESSION_SECONDS * 1000;
  const sig = await hmacHex(`campusfix-admin.${expires}`, getAdminPasscode());
  return `${expires}.${sig}`;
}

export async function verifySessionToken(token?: string | null, now: number = Date.now()): Promise<boolean> {
  if (!token || !getAdminPasscode()) return false;
  const [expStr, sig] = token.split(".");
  const expires = Number(expStr);
  if (!sig || !Number.isFinite(expires) || expires < now) return false;
  const expected = await hmacHex(`campusfix-admin.${expires}`, getAdminPasscode());
  return safeEqual(sig, expected);
}

/** Single decision point used by the middleware and the admin layout. */
export async function isAuthorized(token?: string | null): Promise<boolean> {
  const mode = getAuthMode();
  if (mode === "open-dev") return true;
  if (mode === "locked") return false;
  return verifySessionToken(token);
}
