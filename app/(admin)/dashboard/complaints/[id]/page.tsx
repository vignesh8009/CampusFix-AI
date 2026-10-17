import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Copy, History, Users } from "lucide-react";
import { getComplaint, recommendAction, searchSimilarComplaints } from "@/lib/agent/tools";
import { listAudit, listInvestigations } from "@/lib/database/queries";
import { complaintIdSchema } from "@/lib/validation/schemas";
import { AiSourceBadge, DemoTag, PriorityBadge, SafetyBadge, StatusBadge } from "@/components/badges";
import { ApproveTicketButton, ComplaintStatusForm, ReanalyzeButton } from "@/components/ComplaintActions";
import { TicketStatusForm } from "@/components/TicketActions";
import { COMPLAINT_TRANSITIONS, TICKET_TRANSITIONS, canCreateTicket } from "@/lib/agent/transitions";
import { ACTIVE_TICKET_STATUSES, ComplaintStatus, TicketStatus } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ComplaintDetailPage({ params }: { params: { id: string } }) {
  const parsed = complaintIdSchema.safeParse(params.id);
  if (!parsed.success) notFound();
  const complaint = await getComplaint(parsed.data);
  if (!complaint) notFound();

  const [similar, investigations, audit, rec] = await Promise.all([
    searchSimilarComplaints(complaint.complaintId),
    listInvestigations(complaint.id),
    listAudit(complaint.id),
    recommendAction(complaint.complaintId),
  ]);

  const activeTickets = complaint.tickets.filter((t) => ACTIVE_TICKET_STATUSES.includes(t.status));
  const ticketRule = canCreateTicket({
    approval: true,
    complaintStatus: complaint.status,
    duplicateOfComplaintId: complaint.duplicateOf?.complaintId ?? null,
    activeTicketCount: activeTickets.length,
  });
  const latest = investigations[0];
  const statusOptions = COMPLAINT_TRANSITIONS[complaint.status as ComplaintStatus] ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-sign hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All complaints
      </Link>

      <header className="mt-3">
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wider text-sign">
          {complaint.complaintId} {complaint.isDemo && <DemoTag />}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{complaint.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          {complaint.safetyFlag && <SafetyBadge />}
          <span className="text-sm text-muted">{complaint.category} in {complaint.location}</span>
        </div>
      </header>

      {complaint.safetyFlag && (
        <div role="alert" className="mt-4 rounded-md border border-red-400 bg-red-50 p-4 text-sm text-red-900">
          <strong>Possible safety concern.</strong> Safety rules flagged this report for urgent human review. The
          priority cannot be lowered by the AI. This tool does not contact emergency services or staff; follow
          your campus emergency procedure.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="text-lg font-bold">Report</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{complaint.description}</p>
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
              <div><dt className="font-semibold">Reporter</dt><dd className="text-muted">{complaint.anonymous ? "Anonymous" : complaint.studentName ?? "Not provided"}</dd></div>
              <div><dt className="font-semibold">Submitted</dt><dd className="text-muted">{formatDate(complaint.createdAt)}</dd></div>
              <div><dt className="font-semibold">Last updated</dt><dd className="text-muted">{formatDate(complaint.updatedAt)}</dd></div>
            </dl>
          </section>

          <section className="panel p-5" aria-labelledby="ai-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="ai-heading" className="flex items-center gap-2 text-lg font-bold">
                <Bot className="h-5 w-5 text-sign" aria-hidden="true" /> AI investigation
              </h2>
              <AiSourceBadge source={complaint.aiSource} />
            </div>
            {complaint.aiSource ? (
              <dl className="mt-3 space-y-3 text-sm">
                <div><dt className="font-semibold">Summary</dt><dd className="text-muted">{complaint.aiSummary}</dd></div>
                <div><dt className="font-semibold">Reasoning</dt><dd className="text-muted">{complaint.aiReasoning}</dd></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><dt className="font-semibold">Confidence</dt><dd className="text-muted">{complaint.confidence !== null ? `${Math.round((complaint.confidence ?? 0) * 100)}%` : "-"}</dd></div>
                  <div><dt className="font-semibold">Analyzed</dt><dd className="text-muted">{formatDateTime(complaint.analyzedAt)}</dd></div>
                </div>
                {complaint.aiSource === "fallback" && complaint.aiFallbackReason && (
                  <p className="rounded-md bg-hazard-light p-2 text-xs text-hazard-dark">Why rules were used: {complaint.aiFallbackReason}</p>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">This complaint has not been analyzed yet. Run the investigation to classify it.</p>
            )}

            {latest && latest.steps.length > 0 && (
              <details className="mt-4 rounded-md border border-line p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Agent steps from the latest run</summary>
                <ol className="mt-2 space-y-1.5">
                  {latest.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${s.status === "ok" ? "bg-emerald-600" : "bg-red-600"}`} aria-label={s.status} />
                      <span><span className="font-semibold">{s.tool}</span>: <span className="text-muted">{s.detail}</span></span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <div className="mt-4"><ReanalyzeButton complaintId={complaint.complaintId} /></div>
          </section>

          <section className="panel p-5" aria-labelledby="sim-heading">
            <h2 id="sim-heading" className="flex items-center gap-2 text-lg font-bold">
              <Copy className="h-5 w-5 text-sign" aria-hidden="true" /> Similar complaints
            </h2>
            {complaint.duplicateOf && (
              <p className="mt-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                Likely duplicate of{" "}
                <Link className="font-semibold underline" href={`/dashboard/complaints/${complaint.duplicateOf.complaintId}`}>{complaint.duplicateOf.complaintId}</Link>
                {complaint.similarityScore !== null && ` (similarity ${Math.round((complaint.similarityScore ?? 0) * 100)}%)`}. This report was kept and linked, and no separate ticket is needed.
              </p>
            )}
            {complaint.duplicates.length > 0 && (
              <p className="mt-2 flex items-center gap-2 rounded-md bg-sign-light p-3 text-sm text-sign-dark">
                <Users className="h-4 w-4" aria-hidden="true" />
                {complaint.duplicates.length + 1} students have reported this problem.
              </p>
            )}
            {similar.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No similar complaints found.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {similar.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/dashboard/complaints/${m.complaintId}`} className="font-semibold text-sign hover:underline">{m.title}</Link>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.isDuplicate ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}>
                        {Math.round(m.score * 100)}% match{m.isDuplicate ? " (duplicate range)" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{m.complaintId} - {m.location} - {m.status}</p>
                    <p className="mt-1 text-xs text-muted">{m.reasons.join(". ")}.</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5" aria-labelledby="audit-heading">
            <h2 id="audit-heading" className="flex items-center gap-2 text-lg font-bold">
              <History className="h-5 w-5 text-sign" aria-hidden="true" /> Audit log
            </h2>
            {audit.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No audit entries yet.</p>
            ) : (
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-4 text-sm">
                {audit.map((a) => (
                  <li key={a.id}>
                    <p className="font-semibold">{a.action.replaceAll("_", " ").toLowerCase()} <span className="font-normal text-muted">by {a.actor}</span></p>
                    <p className="text-muted">{a.details}</p>
                    <p className="text-xs text-muted">{formatDateTime(a.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel border-t-4 border-t-hazard p-5" aria-labelledby="rec-heading">
            <h2 id="rec-heading" className="text-lg font-bold">Recommended action</h2>
            <p className="mt-2 text-sm">{rec.action}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="font-semibold">Assigned team</dt><dd className="text-muted">{rec.team}</dd></div>
              <div><dt className="font-semibold">Priority</dt><dd className="mt-0.5"><PriorityBadge priority={rec.priority} /></dd></div>
            </dl>
            <div className="mt-4 border-t border-line pt-4">
              {ticketRule.ok ? (
                <>
                  <p className="mb-3 text-sm text-muted">A ticket is drafted. Nothing is created until you approve it.</p>
                  <ApproveTicketButton complaintId={complaint.complaintId} team={rec.team} />
                </>
              ) : (
                <p className="text-sm text-muted">{ticketRule.reason}</p>
              )}
            </div>
          </section>

          <section className="panel p-5" aria-labelledby="tk-heading">
            <h2 id="tk-heading" className="text-lg font-bold">Maintenance tickets</h2>
            {complaint.tickets.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No tickets yet.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {complaint.tickets.map((t) => (
                  <li key={t.id} className="rounded-md border border-line p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display font-bold">{t.ticketId}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 text-muted">{t.assignedTeam} - {t.priority} priority</p>
                    <p className="text-xs text-muted">Created {formatDate(t.createdAt)}{t.approvedBy ? ` - approved by ${t.approvedBy}` : ""}</p>
                    {t.resolutionNotes && <p className="mt-2 rounded bg-emerald-50 p-2 text-xs text-emerald-900">Resolution: {t.resolutionNotes}{t.resolvedAt ? ` (${formatDate(t.resolvedAt)})` : ""}</p>}
                    <div className="mt-3">
                      <TicketStatusForm ticketId={t.ticketId} current={t.status} options={TICKET_TRANSITIONS[t.status as TicketStatus] ?? []} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5" aria-labelledby="st-heading">
            <h2 id="st-heading" className="text-lg font-bold">Complaint status</h2>
            <div className="mt-3">
              <ComplaintStatusForm complaintId={complaint.complaintId} current={complaint.status} options={statusOptions} />
            </div>
            {complaint.resolutionNotes && (
              <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Resolution notes:</strong> {complaint.resolutionNotes}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
