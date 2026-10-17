import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  getAuthMode,
  isAuthorized,
  passcodeMatches,
  safeEqual,
  verifySessionToken,
} from "../lib/auth";

// Older Node versions do not expose Web Crypto globally.
if (!(globalThis as { crypto?: unknown }).crypto) {
  (globalThis as { crypto?: unknown }).crypto = webcrypto;
}

const env = process.env as Record<string, string | undefined>;
const original = { pass: env.ADMIN_PASSCODE, node: env.NODE_ENV };

beforeEach(() => {
  env.ADMIN_PASSCODE = "correct horse battery";
  env.NODE_ENV = "test";
});
afterEach(() => {
  env.ADMIN_PASSCODE = original.pass;
  env.NODE_ENV = original.node;
});

describe("admin auth modes", () => {
  it("is enabled when a passcode is set", () => {
    expect(getAuthMode()).toBe("enabled");
  });
  it("is open in development and locked in production without a passcode", () => {
    env.ADMIN_PASSCODE = "";
    expect(getAuthMode()).toBe("open-dev");
    env.NODE_ENV = "production";
    expect(getAuthMode()).toBe("locked");
  });
});

describe("passcode and session tokens", () => {
  it("accepts only the correct passcode", async () => {
    expect(await passcodeMatches("correct horse battery")).toBe(true);
    expect(await passcodeMatches("wrong")).toBe(false);
    expect(await passcodeMatches("")).toBe(false);
  });

  it("creates a token that verifies", async () => {
    expect(await verifySessionToken(await createSessionToken())).toBe(true);
  });

  it("rejects tampered, expired, empty and malformed tokens", async () => {
    const token = await createSessionToken();
    const [exp, sig] = token.split(".");
    expect(await verifySessionToken(`${Number(exp) + 1000}.${sig}`)).toBe(false);
    expect(await verifySessionToken(`${exp}.${sig.slice(0, -1)}0`)).toBe(false);
    expect(await verifySessionToken(token, Number(exp) + 1)).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
    expect(await verifySessionToken(null)).toBe(false);
    expect(await verifySessionToken("garbage")).toBe(false);
  });

  it("invalidates old sessions when the passcode changes", async () => {
    const token = await createSessionToken();
    env.ADMIN_PASSCODE = "a different passcode";
    expect(await verifySessionToken(token)).toBe(false);
  });

  it("compares strings safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("authorization decision", () => {
  it("blocks requests without a valid session when enabled", async () => {
    expect(await isAuthorized(undefined)).toBe(false);
    expect(await isAuthorized(await createSessionToken())).toBe(true);
  });
  it("allows everyone in open-dev and no one when locked", async () => {
    const token = await createSessionToken(); // signed while a passcode exists
    env.ADMIN_PASSCODE = "";
    expect(await isAuthorized(undefined)).toBe(true);
    env.NODE_ENV = "production";
    expect(await isAuthorized(undefined)).toBe(false);
    expect(await isAuthorized(token)).toBe(false);
  });
});
