import { ACTIVE_TICKET_STATUSES, OPEN_COMPLAINT_STATUSES } from "../constants";

export interface MetricComplaint {
  id: string;
  status: string;
  priority: string;
  duplicateOfId: string | null;
}
export interface MetricTicket {
  complaintId: string;
  status: string;
}

export interface DashboardMetrics {
  total: number;
  open: number;
  critical: number;
  resolved: number;
  duplicates: number;
  /** Tickets with status "Pending Approval" plus suggestions still awaiting admin approval. */
  pendingTickets: number;
  activeTickets: number;
}

/**
 * All numbers come from the records passed in (real database rows).
 * - critical = open complaints with Critical priority
 * - pendingTickets = open, non-duplicate complaints with no active ticket
 *   (the agent has suggested a ticket and an admin has not approved it yet)
 */
export function computeMetrics(complaints: MetricComplaint[], tickets: MetricTicket[]): DashboardMetrics {
  const activeByComplaint = new Set(
    tickets.filter((t) => ACTIVE_TICKET_STATUSES.includes(t.status)).map((t) => t.complaintId)
  );
  const isOpen = (c: MetricComplaint) => OPEN_COMPLAINT_STATUSES.includes(c.status);

  const awaitingApproval = complaints.filter(
    (c) => isOpen(c) && !c.duplicateOfId && !activeByComplaint.has(c.id)
  ).length;
  const pendingApprovalTickets = tickets.filter((t) => t.status === "Pending Approval").length;

  return {
    total: complaints.length,
    open: complaints.filter(isOpen).length,
    critical: complaints.filter((c) => isOpen(c) && c.priority === "Critical").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
    duplicates: complaints.filter((c) => c.duplicateOfId !== null).length,
    pendingTickets: awaitingApproval + pendingApprovalTickets,
    activeTickets: tickets.filter((t) => ACTIVE_TICKET_STATUSES.includes(t.status)).length,
  };
}
