import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export async function writeAudit(
  entry: {
    complaintId?: string | null; // internal complaint id
    ticketId?: string | null; // internal ticket id
    action: string;
    actor?: "system" | "agent" | "admin" | "student";
    details: string;
  },
  db: Db = prisma
) {
  return db.auditLog.create({
    data: {
      complaintId: entry.complaintId ?? null,
      ticketId: entry.ticketId ?? null,
      action: entry.action,
      actor: entry.actor ?? "system",
      details: entry.details.slice(0, 1000),
    },
  });
}
