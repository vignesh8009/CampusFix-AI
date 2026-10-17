/**
 * Agent tools. Each tool does one real thing against the real database.
 * Public complaint IDs (CF-XXXXXX) are used at the tool boundary.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";
import { writeAudit } from "../database/audit";
import { AppError } from "../api";
import {
  ACTIVE_TICKET_STATUSES,
  Category,
  OPEN_COMPLAINT_STATUSES,
  REPEAT_ESCALATION_COUNT,
  TEAM_BY_CATEGORY,
  bumpPriority,
  getDuplicateThreshold,
  isCategory,
  isPriority,
  Priority,
} from "../constants";
import { analyzeComplaintText, AnalysisResult } from "../ai/analyze";
import { findSimilar, SimilarityMatch } from "../duplicate-detection";
import {
  canCreateTicket,
  canTransitionComplaint,
  canTransitionTicket,
  complaintStatusForTicket,
  validateResolutionNotes,
} from "./transitions";
import { generateTicketId } from "../ids";
import { computeMetrics } from "../analytics/metrics";

// ---------- getComplaint ----------
export async function getComplaint(complaintId: string) {
  return prisma.complaint.findUnique({
    where: { complaintId },
    include: {
      tickets: { orderBy: { createdAt: "desc" } },
      duplicateOf: { select: { id: true, complaintId: true, title: true, status: true } },
      duplicates: {
        select: { id: true, complaintId: true, title: true, status: true, createdAt: true, similarityScore: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function requireComplaint(complaintId: string) {
  const c = await getComplaint(complaintId);
  if (!c) throw new AppError(404, `Complaint ${complaintId} was not found`, "NOT_FOUND");
  return c;
}

// ---------- searchSimilarComplaints ----------
export async function searchSimilarComplaints(
  complaintId: string,
  opts: { onlyOlderOpen?: boolean } = {}
): Promise<SimilarityMatch[]> {
  const target = await requireComplaint(complaintId);
  const where: Prisma.ComplaintWhereInput = { id: { not: target.id } };
  if (opts.onlyOlderOpen) {
    where.createdAt = { lt: target.createdAt };
    where.status = { in: [...OPEN_COMPLAINT_STATUSES] };
    // Never link to a complaint that is itself a duplicate of the target.
    where.OR = [{ duplicateOfId: null }, { duplicateOfId: { not: target.id } }];
  }
  const candidates = await prisma.complaint.findMany({ where, take: 500, orderBy: { createdAt: "desc" } });
  return findSimilar(target, candidates, { threshold: getDuplicateThreshold() });
}

// ---------- classifyComplaint ----------
export async function classifyComplaint(complaintId: string): Promise<AnalysisResult> {
  const c = await requireComplaint(complaintId);
  const result = await analyzeComplaintText({
    title: c.title,
    description: c.description,
    location: c.location,
    category: c.category,
  });
  const a = result.analysis;
  const recategorize = c.category === "Other" && isCategory(a.category) && a.category !== "Other";

  await prisma.complaint.update({
    where: { id: c.id },
    data: {
      category: recategorize ? a.category : c.category,
      priority: a.priority,
      safetyFlag: result.safetyFlag,
      aiSource: result.source,
      aiFallbackReason: result.fallbackReason ?? null,
      aiSummary: a.summary,
      aiReasoning: a.reasoning,
      recommendedAction: a.recommendedAction,
      assignedTeam: a.assignedTeam,
      confidence: a.confidence,
      analyzedAt: new Date(),
    },
  });
  await writeAudit({
    complaintId: c.id,
    action: "COMPLAINT_CLASSIFIED",
    actor: "agent",
    details: `Source: ${result.source}. Category: ${a.category}. Priority: ${a.priority}.${
      result.safetyFlag ? " Flagged for urgent human review." : ""
    }${recategorize ? ` Category changed from Other to ${a.category}.` : ""}`,
  });
  return result;
}

// ---------- investigateComplaint ----------
export interface Investigation {
  matches: SimilarityMatch[];
  duplicateOfComplaintId: string | null;
  relatedCount: number;
  escalatedTo: Priority | null;
  notes: string[];
}

export async function investigateComplaint(complaintId: string): Promise<Investigation> {
  const c = await requireComplaint(complaintId);
  const matches = await searchSimilarComplaints(complaintId, { onlyOlderOpen: true });
  const best = matches.find((m) => m.isDuplicate) ?? null;
  const notes: string[] = [];
  let duplicateOfComplaintId: string | null = null;
  let rootInternalId: string | null = null;

  if (best) {
    const candidate = await prisma.complaint.findUnique({
      where: { id: best.id },
      select: { id: true, complaintId: true, duplicateOfId: true },
    });
    rootInternalId = candidate?.duplicateOfId ?? candidate?.id ?? null;
    const root = rootInternalId
      ? await prisma.complaint.findUnique({ where: { id: rootInternalId }, select: { id: true, complaintId: true } })
      : null;
    if (root && root.id !== c.id) {
      duplicateOfComplaintId = root.complaintId;
      rootInternalId = root.id;
      notes.push(`Likely duplicate of ${root.complaintId} (similarity ${Math.round(best.score * 100)}%).`);
    } else {
      rootInternalId = null;
    }
  }

  await prisma.complaint.update({
    where: { id: c.id },
    data: { duplicateOfId: rootInternalId, similarityScore: rootInternalId && best ? best.score : null },
  });
  if (duplicateOfComplaintId) {
    await writeAudit({
      complaintId: c.id,
      action: "DUPLICATE_LINKED",
      actor: "agent",
      details: `Linked to ${duplicateOfComplaintId} (score ${best?.score}). New complaint preserved.`,
    });
  }

  // Count related reports around the root (or this complaint if it is the root).
  const rootId = rootInternalId ?? c.id;
  const relatedCount = await prisma.complaint.count({ where: { duplicateOfId: rootId } });
  let escalatedTo: Priority | null = null;

  if (relatedCount + 1 >= REPEAT_ESCALATION_COUNT) {
    const fresh = await prisma.complaint.findUnique({ where: { id: rootId }, select: { priority: true } });
    if (fresh && isPriority(fresh.priority)) {
      const bumped = bumpPriority(fresh.priority, "High");
      if (bumped !== fresh.priority) {
        await prisma.complaint.update({ where: { id: rootId }, data: { priority: bumped } });
        escalatedTo = bumped;
        notes.push(
          `${relatedCount + 1} students reported this issue, so priority was raised from ${fresh.priority} to ${bumped}.`
        );
        await writeAudit({
          complaintId: rootId,
          action: "PRIORITY_ESCALATED",
          actor: "agent",
          details: `Repeated reports (${relatedCount + 1}). Priority ${fresh.priority} to ${bumped}.`,
        });
      }
    }
  }
  if (matches.length > 0 && !duplicateOfComplaintId) {
    notes.push(`${matches.length} similar complaint(s) found, but none above the duplicate threshold.`);
  }
  if (matches.length === 0) notes.push("No similar unresolved complaints found.");

  return { matches, duplicateOfComplaintId, relatedCount, escalatedTo, notes };
}

// ---------- recommendAction ----------
export interface Recommendation {
  action: string;
  team: string;
  priority: string;
  suggestTicket: boolean;
  reason: string;
}

export async function recommendAction(complaintId: string): Promise<Recommendation> {
  const c = await requireComplaint(complaintId);
  const team =
    c.assignedTeam ?? TEAM_BY_CATEGORY[(isCategory(c.category) ? c.category : "Other") as Category];
  let action = c.recommendedAction ?? "Assign a staff member to inspect the location.";

  if (c.duplicateOf) {
    return {
      action: `${action} This report is linked to ${c.duplicateOf.complaintId}; track progress there instead of opening a new ticket.`,
      team,
      priority: c.priority,
      suggestTicket: false,
      reason: `Duplicate of ${c.duplicateOf.complaintId}. A new ticket would duplicate work.`,
    };
  }
  const related = c.duplicates.length;
  if (related > 0) action += ` ${related + 1} students have reported this problem.`;
  if (c.safetyFlag) action = `URGENT HUMAN REVIEW: possible safety concern. ${action}`;

  const hasActive = c.tickets.some((t) => ACTIVE_TICKET_STATUSES.includes(t.status));
  const open = OPEN_COMPLAINT_STATUSES.includes(c.status);
  return {
    action,
    team,
    priority: c.priority,
    suggestTicket: open && !hasActive,
    reason: hasActive
      ? "An active ticket already exists."
      : open
        ? "Ticket is ready for admin approval."
        : "Complaint is not open.",
  };
}

// ---------- createMaintenanceTicket ----------
export async function createMaintenanceTicket(
  complaintId: string,
  approval: { approved: boolean; approvedBy?: string }
) {
  const c = await requireComplaint(complaintId);
  const rule = canCreateTicket({
    approval: approval.approved,
    complaintStatus: c.status,
    duplicateOfComplaintId: c.duplicateOf?.complaintId ?? null,
    activeTicketCount: c.tickets.filter((t) => ACTIVE_TICKET_STATUSES.includes(t.status)).length,
  });
  if (!rule.ok) {
    throw new AppError(approval.approved ? 409 : 400, rule.reason ?? "Ticket cannot be created", "TICKET_RULE");
  }
  const rec = await recommendAction(complaintId);

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.create({
      data: {
        ticketId: generateTicketId(),
        complaintId: c.id,
        assignedTeam: rec.team,
        recommendedAction: rec.action,
        priority: c.priority,
        status: "Approved",
        approvedBy: approval.approvedBy?.trim() || "Admin",
      },
    });
    await tx.complaint.update({ where: { id: c.id }, data: { status: "Under Review" } });
    await writeAudit(
      {
        complaintId: c.id,
        ticketId: ticket.id,
        action: "TICKET_CREATED",
        actor: "admin",
        details: `Ticket ${ticket.ticketId} approved and created for ${rec.team}. This is an internal prototype ticket; no staff were dispatched.`,
      },
      tx
    );
    return ticket;
  });
}

// ---------- updateComplaintStatus ----------
export async function updateComplaintStatus(complaintId: string, status: string, notes?: string) {
  const c = await requireComplaint(complaintId);
  const t = canTransitionComplaint(c.status, status);
  if (!t.ok) throw new AppError(409, t.reason ?? "Invalid status change", "INVALID_TRANSITION");
  const n = validateResolutionNotes(status, notes);
  if (!n.ok) throw new AppError(400, n.reason ?? "Resolution notes required", "NOTES_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const resolving = status === "Resolved";
    const closing = status === "Closed";
    const updated = await tx.complaint.update({
      where: { id: c.id },
      data: {
        status,
        resolutionNotes: resolving ? notes!.trim() : closing && notes ? notes.trim() : c.resolutionNotes,
        resolvedAt: resolving ? now : status === "Under Review" ? null : c.resolvedAt,
      },
    });

    // Keep active tickets consistent with the complaint.
    if (resolving || closing) {
      const active = c.tickets.filter((x) => ACTIVE_TICKET_STATUSES.includes(x.status));
      for (const tk of active) {
        await tx.maintenanceTicket.update({
          where: { id: tk.id },
          data: resolving
            ? { status: "Resolved", resolutionNotes: notes!.trim(), resolvedAt: now }
            : { status: "Cancelled", resolutionNotes: notes?.trim() || "Complaint closed" },
        });
        await writeAudit(
          {
            complaintId: c.id,
            ticketId: tk.id,
            action: resolving ? "TICKET_RESOLVED" : "TICKET_CANCELLED",
            actor: "admin",
            details: `Ticket ${tk.ticketId} ${resolving ? "resolved" : "cancelled"} because the complaint was ${status.toLowerCase()}.`,
          },
          tx
        );
      }
      await cascadeToDuplicates(tx, c.id, c.complaintId, status, notes, now);
    }

    await writeAudit(
      {
        complaintId: c.id,
        action: "STATUS_CHANGED",
        actor: "admin",
        details: `Status ${c.status} to ${status}.${notes ? ` Notes: ${notes.trim()}` : ""}`,
      },
      tx
    );
    return updated;
  });
}

async function cascadeToDuplicates(
  tx: Prisma.TransactionClient,
  rootId: string,
  rootPublicId: string,
  status: string,
  notes: string | undefined,
  now: Date
) {
  if (status !== "Resolved") return;
  const dups = await tx.complaint.findMany({
    where: { duplicateOfId: rootId, status: { in: [...OPEN_COMPLAINT_STATUSES] } },
    select: { id: true, complaintId: true },
  });
  for (const d of dups) {
    await tx.complaint.update({
      where: { id: d.id },
      data: { status: "Resolved", resolvedAt: now, resolutionNotes: `Resolved together with ${rootPublicId}. ${notes?.trim() ?? ""}`.trim() },
    });
    await writeAudit(
      { complaintId: d.id, action: "STATUS_CHANGED", actor: "system", details: `Resolved automatically because original complaint ${rootPublicId} was resolved.` },
      tx
    );
  }
}

// ---------- updateTicketStatus ----------
export async function updateTicketStatus(
  ticketId: string,
  input: { status: string; resolutionNotes?: string; assignedTeam?: string }
) {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { ticketId },
    include: { complaint: { select: { id: true, complaintId: true, status: true } } },
  });
  if (!ticket) throw new AppError(404, `Ticket ${ticketId} was not found`, "NOT_FOUND");

  const t = canTransitionTicket(ticket.status, input.status);
  if (!t.ok) throw new AppError(409, t.reason ?? "Invalid ticket status change", "INVALID_TRANSITION");
  const n = validateResolutionNotes(input.status, input.resolutionNotes);
  if (!n.ok) throw new AppError(400, n.reason ?? "Resolution notes required", "NOTES_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const resolving = input.status === "Resolved";
    const updated = await tx.maintenanceTicket.update({
      where: { id: ticket.id },
      data: {
        status: input.status,
        assignedTeam: input.assignedTeam ?? ticket.assignedTeam,
        resolutionNotes: input.resolutionNotes?.trim() || ticket.resolutionNotes,
        resolvedAt: resolving ? now : ticket.resolvedAt,
      },
    });

    const next = complaintStatusForTicket(input.status);
    if (next && next !== ticket.complaint.status) {
      await tx.complaint.update({
        where: { id: ticket.complaint.id },
        data: {
          status: next,
          resolvedAt: resolving ? now : null,
          resolutionNotes: resolving ? input.resolutionNotes!.trim() : undefined,
        },
      });
      if (resolving) {
        await cascadeToDuplicates(tx, ticket.complaint.id, ticket.complaint.complaintId, "Resolved", input.resolutionNotes, now);
      }
    }
    await writeAudit(
      {
        complaintId: ticket.complaint.id,
        ticketId: ticket.id,
        action: "TICKET_STATUS_CHANGED",
        actor: "admin",
        details: `Ticket ${ticket.ticketId}: ${ticket.status} to ${input.status}.${
          input.resolutionNotes ? ` Notes: ${input.resolutionNotes.trim()}` : ""
        }`,
      },
      tx
    );
    return updated;
  });
}

// ---------- getDashboardMetrics ----------
export async function getDashboardMetrics() {
  const [complaints, tickets] = await Promise.all([
    prisma.complaint.findMany({ select: { id: true, status: true, priority: true, duplicateOfId: true } }),
    prisma.maintenanceTicket.findMany({ select: { complaintId: true, status: true } }),
  ]);
  return computeMetrics(complaints, tickets);
}
