"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw, Ticket } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? "Request failed");
  return json.data;
}

export function ReanalyzeButton({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await call(`/api/complaints/${complaintId}/analyze`, "POST");
          toast.success("Investigation re-run and saved");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Analysis failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
      Re-run investigation
    </button>
  );
}

export function ApproveTicketButton({ complaintId, team }: { complaintId: string; team: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Ticket className="h-4 w-4" aria-hidden="true" />
        Approve and create ticket
      </button>
      <ConfirmDialog
        open={open}
        busy={busy}
        title="Create maintenance ticket?"
        message={`This approves the agent's recommendation and creates an internal ticket for ${team}. No staff are contacted automatically.`}
        confirmLabel="Approve and create"
        onCancel={() => !busy && setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            const t = await call(`/api/complaints/${complaintId}/ticket`, "POST", { approval: true, approvedBy: "Admin" });
            toast.success(`Ticket ${t.ticketId} created`);
            setOpen(false);
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Ticket could not be created");
            setOpen(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

export function ComplaintStatusForm({ complaintId, current, options }: { complaintId: string; current: string; options: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(options[0] ?? "");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsNotes = status === "Resolved";

  if (options.length === 0) return <p className="text-sm text-muted">No further status changes are available.</p>;

  return (
    <>
      <div className="space-y-3">
        <div>
          <label htmlFor="new-status" className="label">Change status from {current} to</label>
          <select id="new-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status-notes" className="label">{needsNotes ? "Resolution notes (required)" : "Notes (optional)"}</label>
          <textarea id="status-notes" rows={3} className="field" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={needsNotes && notes.trim().length < 5}
          onClick={() => setOpen(true)}
        >
          Update status
        </button>
      </div>
      <ConfirmDialog
        open={open}
        busy={busy}
        title={`Change status to ${status}?`}
        message={status === "Resolved" || status === "Closed" ? "Any active ticket for this complaint will be updated to match, and linked duplicate reports are resolved together." : "The change is recorded in the audit log."}
        confirmLabel="Update status"
        onCancel={() => !busy && setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await call(`/api/complaints/${complaintId}/status`, "PATCH", { status, notes: notes.trim() || undefined });
            toast.success(`Status changed to ${status}`);
            setNotes("");
            setOpen(false);
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Status could not be changed");
            setOpen(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
