import { AlertOctagon, AlertTriangle, ArrowDown, Circle, Sparkles, Cpu, ShieldAlert } from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-slate-100 text-slate-800 ring-slate-300",
  Medium: "bg-blue-50 text-blue-900 ring-blue-300",
  High: "bg-orange-100 text-orange-900 ring-orange-400",
  Critical: "bg-red-700 text-white ring-red-800",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const Icon = priority === "Critical" ? AlertOctagon : priority === "High" ? AlertTriangle : priority === "Low" ? ArrowDown : Circle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Medium
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {priority}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-slate-100 text-slate-800 ring-slate-300",
  "Under Review": "bg-blue-50 text-blue-900 ring-blue-300",
  "In Progress": "bg-amber-100 text-amber-900 ring-amber-400",
  Resolved: "bg-emerald-100 text-emerald-900 ring-emerald-400",
  Closed: "bg-slate-200 text-slate-700 ring-slate-400",
  "Pending Approval": "bg-yellow-100 text-yellow-900 ring-yellow-400",
  Approved: "bg-sky-100 text-sky-900 ring-sky-300",
  Assigned: "bg-indigo-100 text-indigo-900 ring-indigo-300",
  Cancelled: "bg-slate-200 text-slate-600 ring-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status] ?? STATUS_STYLES.Submitted
      }`}
    >
      {status}
    </span>
  );
}

export function AiSourceBadge({ source }: { source: string | null | undefined }) {
  if (source === "gemini") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sign-light px-2.5 py-0.5 text-xs font-semibold text-sign-dark ring-1 ring-inset ring-sign/40">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        AI-generated (Gemini)
      </span>
    );
  }
  if (source === "fallback") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-hazard-light px-2.5 py-0.5 text-xs font-semibold text-hazard-dark ring-1 ring-inset ring-hazard">
        <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
        Rule-based (demo analysis)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
      Not analyzed yet
    </span>
  );
}

export function SafetyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-inset ring-red-400">
      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
      Urgent human review
    </span>
  );
}

export function DemoTag() {
  return (
    <span className="rounded bg-hazard-light px-1.5 py-0.5 text-[11px] font-semibold text-hazard-dark ring-1 ring-inset ring-hazard/60">
      Demo data
    </span>
  );
}
