/** Pure business rules for status changes and ticket approval. */
import {
  ACTIVE_TICKET_STATUSES,
  ComplaintStatus,
  OPEN_COMPLAINT_STATUSES,
  TicketStatus,
} from "../constants";

export const COMPLAINT_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  Submitted: ["Under Review", "Closed"],
  "Under Review": ["In Progress", "Resolved", "Closed"],
  "In Progress": ["Under Review", "Resolved", "Closed"],
  Resolved: ["Under Review", "Closed"],
  Closed: ["Under Review"],
};

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  "Pending Approval": ["Approved", "Cancelled"],
  Approved: ["Assigned", "In Progress", "Cancelled"],
  Assigned: ["In Progress", "Cancelled"],
  "In Progress": ["Assigned", "Resolved", "Cancelled"],
  Resolved: [],
  Cancelled: [],
};

export interface RuleResult {
  ok: boolean;
  reason?: string;
}

export function canTransitionComplaint(from: string, to: string): RuleResult {
  const allowed = COMPLAINT_TRANSITIONS[from as ComplaintStatus];
  if (!allowed) return { ok: false, reason: `Unknown current status "${from}"` };
  if (from === to) return { ok: false, reason: `Complaint is already ${from}` };
  if (!allowed.includes(to as ComplaintStatus)) {
    return { ok: false, reason: `Cannot move a complaint from ${from} to ${to}` };
  }
  return { ok: true };
}

export function canTransitionTicket(from: string, to: string): RuleResult {
  const allowed = TICKET_TRANSITIONS[from as TicketStatus];
  if (!allowed) return { ok: false, reason: `Unknown current ticket status "${from}"` };
  if (from === to) return { ok: false, reason: `Ticket is already ${from}` };
  if (!allowed.includes(to as TicketStatus)) {
    return { ok: false, reason: `Cannot move a ticket from ${from} to ${to}` };
  }
  return { ok: true };
}

export function resolutionNotesRequired(status: string): boolean {
  return status === "Resolved";
}

export function validateResolutionNotes(status: string, notes?: string | null): RuleResult {
  if (resolutionNotesRequired(status) && (!notes || notes.trim().length < 5)) {
    return { ok: false, reason: "Resolution notes (at least 5 characters) are required to resolve" };
  }
  return { ok: true };
}

export interface TicketCreationContext {
  approval: boolean;
  complaintStatus: string;
  duplicateOfComplaintId?: string | null;
  activeTicketCount: number;
  allowMultipleActive?: boolean;
}

/** Rules that must pass before a maintenance ticket can be created. */
export function canCreateTicket(ctx: TicketCreationContext): RuleResult {
  if (!ctx.approval) {
    return { ok: false, reason: "Explicit admin approval is required to create a ticket" };
  }
  if (ctx.duplicateOfComplaintId) {
    return {
      ok: false,
      reason: `This complaint is a likely duplicate of ${ctx.duplicateOfComplaintId}. Create the ticket on the original complaint instead.`,
    };
  }
  if (!OPEN_COMPLAINT_STATUSES.includes(ctx.complaintStatus)) {
    return { ok: false, reason: `Cannot create a ticket for a ${ctx.complaintStatus} complaint` };
  }
  if (ctx.activeTicketCount > 0 && !ctx.allowMultipleActive) {
    return { ok: false, reason: "This complaint already has an active maintenance ticket" };
  }
  return { ok: true };
}

export function isActiveTicketStatus(status: string): boolean {
  return ACTIVE_TICKET_STATUSES.includes(status);
}

/** Complaint status that should follow a ticket status change (null = leave as is). */
export function complaintStatusForTicket(ticketStatus: string): ComplaintStatus | null {
  switch (ticketStatus) {
    case "Approved":
    case "Assigned":
    case "Cancelled":
      return "Under Review";
    case "In Progress":
      return "In Progress";
    case "Resolved":
      return "Resolved";
    default:
      return null;
  }
}
