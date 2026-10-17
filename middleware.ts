import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAuthMode, isAuthorized } from "@/lib/auth";

/**
 * Protects the admin pages and admin APIs.
 * Public on purpose: the landing page, report form, tracking page,
 * POST /api/complaints (students submit), GET /api/track/:id, /admin/login.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Students must be able to submit complaints without logging in.
  if (pathname === "/api/complaints" && req.method === "POST") return NextResponse.next();

  if (await isAuthorized(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    const locked = getAuthMode() === "locked";
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: locked
            ? "Admin access is disabled. Set ADMIN_PASSCODE in .env and restart the server."
            : "Admin login required.",
        },
      },
      { status: 401 }
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tickets/:path*",
    "/insights/:path*",
    "/api/complaints",
    "/api/complaints/:path*",
    "/api/tickets/:path*",
    "/api/dashboard/:path*",
    "/api/insights/:path*",
  ],
};
