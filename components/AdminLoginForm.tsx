"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Lock } from "lucide-react";

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!passcode) {
      setError("Enter the admin passcode");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Login failed. Try again.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel space-y-4 p-6">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      <div>
        <label htmlFor="passcode" className="label">
          Admin passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoComplete="current-password"
          className="field"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Checking..." : "Log in"}
      </button>
    </form>
  );
}
