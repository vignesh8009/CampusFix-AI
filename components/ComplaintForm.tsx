"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { CATEGORIES, LOCATION_SUGGESTIONS } from "@/lib/constants";
import { createComplaintSchema } from "@/lib/validation/schemas";
import { AiSourceBadge, PriorityBadge, SafetyBadge, StatusBadge } from "@/components/badges";
import { CopyButton } from "@/components/CopyButton";
import { useToast } from "@/components/Toast";

interface Result {
  complaintId: string;
  status: string;
  priority: string;
  category: string;
  aiSource: string | null;
  safetyFlag: boolean;
  analysisCompleted: boolean;
  alreadySubmitted: boolean;
}

const EMPTY = { title: "", description: "", location: "", category: "", studentName: "", anonymous: false };

export function ComplaintForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const submittingRef = useRef(false);
  const toast = useToast();

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return; // blocks accidental double submits
    setFormError(null);

    const parsed = createComplaintSchema.safeParse({
      ...values,
      studentName: values.anonymous ? undefined : values.studentName || undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setFormError("Fix the highlighted fields and submit again.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        const fieldErrors = json?.error?.fieldErrors as Record<string, string[]> | undefined;
        if (fieldErrors) {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(fieldErrors)) if (v?.[0]) next[k] = v[0];
          setErrors(next);
        }
        setFormError(json?.error?.message ?? "The complaint could not be submitted. Try again.");
        return;
      }
      setResult(json.data as Result);
      toast.success(`Complaint ${json.data.complaintId} submitted`);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="panel p-6 sm:p-8" role="status">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-sign" aria-hidden="true" />
          <h2 className="text-2xl font-bold">
            {result.alreadySubmitted ? "This report was already submitted" : "Complaint submitted"}
          </h2>
        </div>
        <p className="mt-4 text-sm text-muted">Save this complaint ID. You need it to track progress.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="rounded-md border-2 border-dashed border-sign bg-sign-light px-4 py-2 font-display text-3xl font-bold tracking-wider text-sign-dark">
            {result.complaintId}
          </p>
          <CopyButton value={result.complaintId} />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={result.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold">Priority</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={result.priority} />
              {result.safetyFlag && <SafetyBadge />}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold">Category</dt>
            <dd className="mt-1 text-sm">{result.category}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold">Analysis</dt>
            <dd className="mt-1">
              <AiSourceBadge source={result.aiSource} />
            </dd>
          </div>
        </dl>
        {!result.analysisCompleted && !result.alreadySubmitted && (
          <p className="mt-4 rounded-md bg-hazard-light p-3 text-sm text-hazard-dark">
            Your report is saved. Automatic analysis did not finish, so an admin will review it manually.
          </p>
        )}
        {result.safetyFlag && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-900">
            This report mentions a possible safety hazard and has been flagged for urgent human review. This
            system does not contact emergency services. If anyone is in danger, contact campus security now.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/tracking?id=${result.complaintId}`} className="btn-primary">
            Track this complaint
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setResult(null);
              setValues(EMPTY);
              setErrors({});
            }}
          >
            Report another issue
          </button>
        </div>
      </div>
    );
  }

  const err = (k: string) => errors[k] || undefined;
  const common = (k: string) => ({
    "aria-invalid": err(k) ? (true as const) : undefined,
    "aria-describedby": err(k) ? `${k}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="panel space-y-5 p-6 sm:p-8">
      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="title" className="label">
          Complaint title
        </label>
        <input id="title" className="field" maxLength={120} placeholder="Fan not working in Room 204" value={values.title} onChange={(e) => set("title", e.target.value)} {...common("title")} />
        {err("title") && <p id="title-error" className="mt-1 text-sm text-red-700">{err("title")}</p>}
      </div>

      <div>
        <label htmlFor="description" className="label">
          Detailed description
        </label>
        <textarea id="description" rows={5} className="field" maxLength={2000} placeholder="What is wrong, since when, and who is affected?" value={values.description} onChange={(e) => set("description", e.target.value)} {...common("description")} />
        <div className="mt-1 flex justify-between text-sm">
          <span id="description-error" className="text-red-700">{err("description")}</span>
          <span className="text-muted">{values.description.length}/2000</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className="label">
            Campus building or location
          </label>
          <input id="location" list="location-list" className="field" maxLength={120} placeholder="Main Block, Room 204" value={values.location} onChange={(e) => set("location", e.target.value)} {...common("location")} />
          <datalist id="location-list">
            {LOCATION_SUGGESTIONS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
          {err("location") && <p id="location-error" className="mt-1 text-sm text-red-700">{err("location")}</p>}
        </div>
        <div>
          <label htmlFor="category" className="label">
            Category
          </label>
          <select id="category" className="field" value={values.category} onChange={(e) => set("category", e.target.value)} {...common("category")}>
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {err("category") && <p id="category-error" className="mt-1 text-sm text-red-700">{err("category")}</p>}
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="label">Your details (optional)</legend>
        <div>
          <label htmlFor="studentName" className="sr-only">
            Your name
          </label>
          <input id="studentName" className="field" maxLength={80} placeholder="Your name" disabled={values.anonymous} value={values.anonymous ? "" : values.studentName} onChange={(e) => set("studentName", e.target.value)} {...common("studentName")} />
          {err("studentName") && <p id="studentName-error" className="mt-1 text-sm text-red-700">{err("studentName")}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#0E6B52]" checked={values.anonymous} onChange={(e) => set("anonymous", e.target.checked)} />
          Report anonymously (your name is not saved)
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <button type="submit" className="btn-primary px-6 py-3" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {submitting ? "Submitting..." : "Submit complaint"}
        </button>
        <p className="text-sm text-muted">We only store what you enter here.</p>
      </div>
    </form>
  );
}
