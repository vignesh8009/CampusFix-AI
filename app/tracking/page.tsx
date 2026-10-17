import { CheckCircle2, Circle, Search, Wrench } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { AiSourceBadge, PriorityBadge, SafetyBadge, StatusBadge } from "@/components/badges";
import { getTrackingView } from "@/lib/database/queries";
import { complaintIdSchema } from "@/lib/validation/schemas";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track a complaint - CampusFix AI" };

const STAGES = ["Submitted", "Under Review", "In Progress", "Resolved"];

export default async function TrackingPage({ searchParams }: { searchParams: { id?: string } }) {
  const rawId = typeof searchParams.id === "string" ? searchParams.id.trim() : "";
  let error: string | null = null;
  let view: Awaited<ReturnType<typeof getTrackingView>> = null;

  if (rawId) {
    const parsed = complaintIdSchema.safeParse(rawId);
    if (!parsed.success) error = parsed.error.issues[0]?.message ?? "Enter a valid complaint ID";
    else {
      view = await getTrackingView(parsed.data);
      if (!view) error = `No complaint found with ID ${parsed.data}. Check the ID and try again.`;
    }
  }

  const stageIndex = view ? (view.status === "Closed" ? STAGES.length - 1 : STAGES.indexOf(view.status)) : -1;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Track a complaint</h1>
        <form action="/tracking" method="get" className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="id" className="sr-only">
              Complaint ID
            </label>
            <input id="id" name="id" defaultValue={rawId} placeholder="CF-ABC234" autoComplete="off" className="field !py-3 font-display text-lg uppercase tracking-wider" aria-invalid={error ? true : undefined} aria-describedby={error ? "track-error" : undefined} />
          </div>
          <button type="submit" className="btn-primary px-6">
            <Search className="h-4 w-4" aria-hidden="true" />
            Find complaint
          </button>
        </form>
        {error && (
          <p id="track-error" role="alert" className="mt-3 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}

        {!rawId && (
          <div className="panel mt-8 p-8 text-center text-muted">
            <Search className="mx-auto h-8 w-8" aria-hidden="true" />
            <p className="mt-3">Enter the complaint ID you received after submitting your report.</p>
          </div>
        )}

        {view && (
          <article className="panel mt-8 p-6 sm:p-8">
            <p className="font-display text-sm font-bold tracking-wider text-sign">{view.complaintId}</p>
            <h2 className="mt-1 text-2xl font-bold">{view.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={view.status} />
              <PriorityBadge priority={view.priority} />
              {view.safetyFlag && <SafetyBadge />}
            </div>

            <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Progress">
              {STAGES.map((s, i) => {
                const done = i <= stageIndex;
                return (
                  <li key={s} className={`border-t-4 pt-2 text-xs sm:text-sm ${done ? "border-sign" : "border-line"}`}>
                    <span className="flex items-center gap-1 font-semibold">
                      {done ? <CheckCircle2 className="h-4 w-4 text-sign" aria-hidden="true" /> : <Circle className="h-4 w-4 text-muted" aria-hidden="true" />}
                      {s}
                    </span>
                  </li>
                );
              })}
            </ol>
            {view.status === "Closed" && <p className="mt-2 text-sm text-muted">This complaint was closed by an admin.</p>}

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold">Submitted</dt><dd className="text-muted">{formatDate(view.createdAt)}</dd></div>
              <div><dt className="font-semibold">Location</dt><dd className="text-muted">{view.location}</dd></div>
              <div><dt className="font-semibold">Category</dt><dd className="text-muted">{view.category}</dd></div>
              {view.relatedReports > 0 && (
                <div><dt className="font-semibold">Other reports of this problem</dt><dd className="text-muted">{view.relatedReports}</dd></div>
              )}
              {view.linkedTo && (
                <div className="sm:col-span-2"><dt className="font-semibold">Linked to</dt><dd className="text-muted">Your report matches {view.linkedTo}. It is being handled together with that complaint.</dd></div>
              )}
            </dl>

            <section className="mt-6 border-t border-line pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold">Analysis summary</h3>
                <AiSourceBadge source={view.aiSource} />
              </div>
              <p className="mt-2 text-sm text-muted">{view.aiSummary ?? "The analysis is not available yet."}</p>
            </section>

            <section className="mt-6 border-t border-line pt-5">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Wrench className="h-5 w-5 text-sign" aria-hidden="true" /> Maintenance ticket
              </h3>
              {view.ticket ? (
                <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="font-semibold">Ticket</dt><dd className="text-muted">{view.ticket.ticketId}</dd></div>
                  <div><dt className="font-semibold">Ticket status</dt><dd className="mt-0.5"><StatusBadge status={view.ticket.status} /></dd></div>
                  <div><dt className="font-semibold">Assigned team</dt><dd className="text-muted">{view.ticket.assignedTeam}</dd></div>
                  <div><dt className="font-semibold">Created</dt><dd className="text-muted">{formatDate(view.ticket.createdAt)}</dd></div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  {view.linkedTo ? `Work is tracked on ${view.linkedTo}.` : "No ticket yet. An admin has to approve a ticket before work is scheduled."}
                </p>
              )}
            </section>

            {(view.status === "Resolved" || view.status === "Closed") && view.resolutionNotes && (
              <section className="mt-6 rounded-md bg-emerald-50 p-4">
                <h3 className="font-bold text-emerald-900">Resolution notes</h3>
                <p className="mt-1 text-sm text-emerald-900">{view.resolutionNotes}</p>
                {view.resolvedAt && <p className="mt-1 text-xs text-emerald-800">Resolved on {formatDate(view.resolvedAt)}</p>}
              </section>
            )}
          </article>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
