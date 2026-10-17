"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

export function TicketStatusForm({ ticketId, current, options }: { ticketId: string; current: string; options: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(options[0] ?? "");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsNotes = status === "Resolved";

  if (options.length === 0) return <p className="text-xs text-muted">Final status ({current}).</p>;

  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={`ts-${ticketId}`} className="sr-only">New status for {ticketId}</label>
        <select id={`ts-${ticketId}`} className="field !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {needsNotes && (
          <>
            <label htmlFor={`tn-${ticketId}`} className="sr-only">Resolution notes for {ticketId}</label>
            <textarea id={`tn-${ticketId}`} rows={2} className="field" placeholder="Resolution notes (required)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
          </>
        )}
        <button type="button" className="btn-secondary !py-1.5" disabled={needsNotes && notes.trim().length < 5} onClick={() => setOpen(true)}>
          Update ticket
        </button>
      </div>
      <ConfirmDialog
        open={open}
        busy={busy}
        danger={status === "Cancelled"}
        title={`Move ${ticketId} to ${status}?`}
        message="The complaint status is kept in sync and the change is written to the audit log."
        confirmLabel="Update ticket"
        onCancel={() => !busy && setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status, resolutionNotes: notes.trim() || undefined }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error?.message ?? "Ticket could not be updated");
            toast.success(`${ticketId} is now ${status}`);
            setNotes("");
            setOpen(false);
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Ticket could not be updated");
            setOpen(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
