import { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, handleError, ok, readJson } from "@/lib/api";
import { ADMIN_COOKIE, SESSION_SECONDS, createSessionToken, getAuthMode, passcodeMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({ passcode: z.string().min(1, "Enter the admin passcode").max(200) });

// Very small in-memory brute-force guard: 5 wrong attempts per minute per client.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    const mode = getAuthMode();
    if (mode === "locked") {
      throw new AppError(503, "Admin access is disabled. Set ADMIN_PASSCODE in .env and restart.", "ADMIN_DISABLED");
    }
    if (mode === "open-dev") return ok({ loggedIn: true, protected: false });

    const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const now = Date.now();
    if (attempts.size > 1000) attempts.clear();
    const entry = attempts.get(client);
    if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
      throw new AppError(429, "Too many attempts. Wait a minute and try again.", "RATE_LIMITED");
    }

    const body = loginSchema.parse(await readJson(req));
    if (!(await passcodeMatches(body.passcode))) {
      const fresh = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
      fresh.count += 1;
      attempts.set(client, fresh);
      throw new AppError(401, "Incorrect passcode.", "INVALID_PASSCODE");
    }

    attempts.delete(client);
    const res = ok({ loggedIn: true, protected: true });
    res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
      secure: req.nextUrl.protocol === "https:",
    });
    return res;
  } catch (err) {
    return handleError(err);
  }
}
