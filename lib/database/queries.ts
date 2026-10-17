/** Read helpers used by server components and API routes. */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ComplaintFilters } from "../validation/schemas";
import { PRIORITY_RANK, Priority } from "../constants";
import { computeInsights } from "../analytics/insights";

export async function listComplaints(f: ComplaintFilters) {
  const where: Prisma.ComplaintWhereInput = {};
  if (f.category) where.category = f.category;
  if (f.priority) where.priority = f.priority;
  if (f.status) where.status = f.status;
  if (f.location) where.location = f.location;
  if (f.q) {
    where.OR = [
      { title: { contains: f.q } },
      { description: { contains: f.q } },
      { location: { contains: f.q } },
      { complaintId: { contains: f.q.toUpperCase() } },
    ];
  }
  const rows = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: f.sort === "oldest" ? "asc" : "desc" },
    include: {
      _count: { select: { duplicates: true } },
      duplicateOf: { select: { complaintId: true } },
      tickets: { select: { ticketId: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 500,
  });
  if (f.sort === "priority") {
    rows.sort(
      (a, b) =>
        (PRIORITY_RANK[b.priority as Priority] ?? 0) - (PRIORITY_RANK[a.priority as Priority] ?? 0) ||
        b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  return rows;
}

export async function listLocations(): Promise<string[]> {
  const rows = await prisma.complaint.findMany({
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  });
  return rows.map((r) => r.location);
}

export async function listInvestigations(complaintInternalId: string) {
  const rows = await prisma.investigationRecord.findMany({
    where: { complaintId: complaintInternalId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((r) => ({
    ...r,
    similar: safeJson<unknown[]>(r.similarJson, []),
    steps: safeJson<{ tool: string; status: string; detail: string }[]>(r.stepsJson, []),
  }));
}

export async function listAudit(complaintInternalId: string) {
  return prisma.auditLog.findMany({
    where: { complaintId: complaintInternalId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listTickets() {
  return prisma.maintenanceTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: { complaint: { select: { complaintId: true, title: true, location: true } } },
    take: 200,
  });
}

export async function listAwaitingApproval() {
  return prisma.complaint.findMany({
    where: {
      status: { in: ["Submitted", "Under Review", "In Progress"] },
      duplicateOfId: null,
      tickets: { none: { status: { in: ["Pending Approval", "Approved", "Assigned", "In Progress"] } } },
    },
    select: { complaintId: true, title: true, location: true, priority: true, assignedTeam: true, safetyFlag: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getInsights() {
  const rows = await prisma.complaint.findMany({
    select: {
      id: true, complaintId: true, title: true, category: true, location: true, priority: true,
      status: true, duplicateOfId: true, createdAt: true, resolvedAt: true,
    },
  });
  return computeInsights(rows);
}

/** Public-safe view for students: no names, no internal notes about other reporters. */
export async function getTrackingView(complaintId: string) {
  const c = await prisma.complaint.findUnique({
    where: { complaintId },
    include: {
      tickets: { orderBy: { createdAt: "desc" } },
      duplicateOf: { select: { complaintId: true } },
      _count: { select: { duplicates: true } },
    },
  });
  if (!c) return null;
  const ticket = c.tickets.find((t) => t.status !== "Cancelled") ?? null;
  return {
    complaintId: c.complaintId,
    title: c.title,
    createdAt: c.createdAt,
    location: c.location,
    category: c.category,
    priority: c.priority,
    status: c.status,
    aiSource: c.aiSource,
    aiSummary: c.aiSummary,
    safetyFlag: c.safetyFlag,
    linkedTo: c.duplicateOf?.complaintId ?? null,
    relatedReports: c._count.duplicates,
    resolutionNotes: c.resolutionNotes,
    resolvedAt: c.resolvedAt,
    ticket: ticket
      ? {
          ticketId: ticket.ticketId,
          status: ticket.status,
          assignedTeam: ticket.assignedTeam,
          createdAt: ticket.createdAt,
          resolutionNotes: ticket.resolutionNotes,
          resolvedAt: ticket.resolvedAt,
        }
      : null,
  };
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
