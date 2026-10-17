import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { listAwaitingApproval, listTickets } from "@/lib/database/queries";
import { PriorityBadge, SafetyBadge, StatusBadge } from "@/components/badges";
import { TicketStatusForm } from "@/components/TicketActions";
import { TICKET_TRANSITIONS } from "@/lib/agent/transitions";
import { TicketStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tickets - CampusFix AI" };

export default async function TicketsPage() {
  const [tickets, awaiting] = await Promise.all([listTickets(), listAwaitingApproval()]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold">Maintenance tickets</h1>
      <p className="mt-1 text-sm text-muted">Internal prototype tickets. Creating one does not contact any staff.</p>

      <section className="panel mt-6 p-5" aria-labelledby="await-heading">
        <h2 id="await-heading" className="text-lg font-bold">Awaiting your approval ({awaiting.length})</h2>
        <p className="text-sm text-muted">Open complaints with a ticket suggested by the agent. Open one to review and approve.</p>
        {awaiting.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing is waiting for approval.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {awaiting.map((c) => (
              <li key={c.complaintId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link href={`/dashboard/complaints/${c.complaintId}`} className="font-semibold text-sign hover:underline">{c.title}</Link>
                  <p className="text-xs text-muted">{c.complaintId} - {c.location} - {c.assignedTeam ?? "Unassigned"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {c.safetyFlag && <SafetyBadge />}
                  <PriorityBadge priority={c.priority} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel mt-6 overflow-hidden" aria-labelledby="tk-heading">
        <h2 id="tk-heading" className="px-5 pt-5 text-lg font-bold">All tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <div className="p-10 text-center text-muted">
            <ClipboardList className="mx-auto h-8 w-8" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">No tickets yet</p>
            <p className="mt-1 text-sm">Approve a suggested ticket from a complaint page to create the first one.</p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Maintenance tickets</caption>
              <thead className="bg-paper text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Ticket</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Complaint</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Team</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Priority</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tickets.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="px-5 py-3"><span className="font-display font-bold">{t.ticketId}</span><p className="text-xs text-muted">{formatDate(t.createdAt)}</p></td>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/complaints/${t.complaint.complaintId}`} className="font-semibold text-sign hover:underline">{t.complaint.title}</Link>
                      <p className="text-xs text-muted">{t.complaint.complaintId} - {t.complaint.location}</p>
                    </td>
                    <td className="px-5 py-3">{t.assignedTeam}</td>
                    <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3 min-w-[12rem]"><TicketStatusForm ticketId={t.ticketId} current={t.status} options={TICKET_TRANSITIONS[t.status as TicketStatus] ?? []} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
