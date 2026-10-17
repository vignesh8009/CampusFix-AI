import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(
  status: number,
  message: string,
  code: string,
  fieldErrors?: Record<string, string[] | undefined>
) {
  return NextResponse.json({ error: { code, message, fieldErrors } }, { status });
}

/** Converts any thrown value into a consistent JSON error without leaking internals. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return errorResponse(400, "Validation failed", "VALIDATION_ERROR", err.flatten().fieldErrors);
  }
  if (err instanceof AppError) {
    return errorResponse(err.status, err.message, err.code);
  }
  console.error("[api] Unexpected error:", err instanceof Error ? err.message : "unknown");
  return errorResponse(500, "Something went wrong on the server. Please try again.", "INTERNAL_ERROR");
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "Request body must be valid JSON", "INVALID_JSON");
  }
}
