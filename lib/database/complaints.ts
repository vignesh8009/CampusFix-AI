import { prisma } from "./prisma";
import { writeAudit } from "./audit";
import { CreateComplaintInput } from "../validation/schemas";
import { buildComplaintData } from "../complaint-data";
import { generateComplaintId } from "../ids";
import { normalizeText } from "../duplicate-detection";

const RESUBMIT_WINDOW_MS = 2 * 60 * 1000;

/**
 * Saves a complaint. If an identical report (same text and location) was saved in the
 * last two minutes it returns that one instead, which stops accidental double submits.
 */
export async function createComplaint(input: CreateComplaintInput) {
  const data = buildComplaintData(input, "");
  const recent = await prisma.complaint.findMany({
    where: { createdAt: { gt: new Date(Date.now() - RESUBMIT_WINDOW_MS) }, location: data.location },
    take: 20,
  });
  const sig = normalizeText(`${data.title} ${data.description}`);
  const existing = recent.find((r) => normalizeText(`${r.title} ${r.description}`) === sig);
  if (existing) return { complaint: existing, alreadySubmitted: true };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const complaint = await prisma.complaint.create({
        data: { ...data, complaintId: generateComplaintId() },
      });
      await writeAudit({
        complaintId: complaint.id,
        action: "COMPLAINT_SUBMITTED",
        actor: "student",
        details: `Complaint ${complaint.complaintId} submitted${data.anonymous ? " anonymously" : ""}.`,
      });
      return { complaint, alreadySubmitted: false };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "P2002") throw err; // retry only on unique ID collision
    }
  }
  throw new Error("Could not generate a unique complaint ID");
}
