/**
 * Controlled agent workflow. The order of steps is fixed in code; the AI model
 * is only used inside classifyComplaint. The workflow never creates a ticket:
 * it only prepares a suggestion that an admin must approve.
 */
import { prisma } from "../database/prisma";
import { writeAudit } from "../database/audit";
import {
  classifyComplaint,
  getComplaint,
  investigateComplaint,
  recommendAction,
} from "./tools";
import { complaintIdSchema } from "../validation/schemas";

export interface WorkflowStep {
  tool: string;
  status: "ok" | "failed" | "skipped";
  detail: string;
}

export async function runAgentWorkflow(rawComplaintId: string) {
  const steps: WorkflowStep[] = [];

  // 1-2. Receive and validate
  const complaintId = complaintIdSchema.parse(rawComplaintId);
  steps.push({ tool: "validate", status: "ok", detail: `Complaint ID ${complaintId} is well formed` });

  // 3. Read from database
  const complaint = await getComplaint(complaintId);
  if (!complaint) {
    steps.push({ tool: "getComplaint", status: "failed", detail: "Complaint not found" });
    throw new Error(`Complaint ${complaintId} not found`);
  }
  steps.push({ tool: "getComplaint", status: "ok", detail: `Loaded "${complaint.title}"` });

  // 4-5. Classify and prioritize (AI or fallback, then safety rules)
  let source: "gemini" | "fallback" = "fallback";
  try {
    const result = await classifyComplaint(complaintId);
    source = result.source;
    steps.push({
      tool: "classifyComplaint",
      status: "ok",
      detail: `${result.analysis.category}, ${result.analysis.priority} priority (${result.source}${
        result.fallbackReason ? `: ${result.fallbackReason}` : ""
      })`,
    });
    if (result.safetyFlag) {
      steps.push({ tool: "safetyRules", status: "ok", detail: "Flagged for urgent human review" });
    }
  } catch (err) {
    steps.push({ tool: "classifyComplaint", status: "failed", detail: "Classification failed; original report kept" });
    console.error("[agent] classify failed:", err instanceof Error ? err.message : "unknown");
  }

  // 6-7. Duplicate search and investigation
  let relatedCount = 0;
  let matchesJson = "[]";
  let investigationNotes: string[] = [];
  try {
    const inv = await investigateComplaint(complaintId);
    relatedCount = inv.relatedCount;
    matchesJson = JSON.stringify(inv.matches);
    investigationNotes = inv.notes;
    steps.push({ tool: "searchSimilarComplaints", status: "ok", detail: `${inv.matches.length} similar complaint(s) found` });
    steps.push({ tool: "investigateComplaint", status: "ok", detail: inv.notes.join(" ") || "Done" });
  } catch (err) {
    steps.push({ tool: "investigateComplaint", status: "failed", detail: "Investigation failed; original report kept" });
    console.error("[agent] investigate failed:", err instanceof Error ? err.message : "unknown");
  }

  // 8-9. Recommendation and ticket suggestion (no ticket is created here)
  const fresh = await getComplaint(complaintId);
  let suggestTicket = false;
  let recommended = fresh?.recommendedAction ?? "";
  try {
    const rec = await recommendAction(complaintId);
    suggestTicket = rec.suggestTicket;
    recommended = rec.action;
    steps.push({
      tool: "recommendAction",
      status: "ok",
      detail: rec.suggestTicket ? `Ticket suggested for ${rec.team}; waiting for admin approval` : rec.reason,
    });
  } catch {
    steps.push({ tool: "recommendAction", status: "failed", detail: "Could not prepare recommendation" });
  }

  // Move a brand-new complaint into review once the agent has looked at it.
  if (fresh && fresh.status === "Submitted") {
    await prisma.complaint.update({ where: { id: fresh.id }, data: { status: "Under Review" } });
  }

  // 12. Store investigation record + audit
  if (fresh) {
    await prisma.investigationRecord.create({
      data: {
        complaintId: fresh.id,
        source,
        summary: fresh.aiSummary ?? fresh.title,
        reasoning: [fresh.aiReasoning, ...investigationNotes].filter(Boolean).join(" "),
        recommendedAction: recommended || "Assign staff to inspect the location.",
        suggestedTeam: fresh.assignedTeam ?? "General Maintenance",
        suggestedPriority: fresh.priority,
        relatedCount,
        similarJson: matchesJson,
        stepsJson: JSON.stringify(steps),
        ticketSuggested: suggestTicket,
        confidence: fresh.confidence ?? null,
      },
    });
    await writeAudit({
      complaintId: fresh.id,
      action: "INVESTIGATION_COMPLETED",
      actor: "agent",
      details: `Workflow finished with ${steps.filter((s) => s.status === "ok").length} successful step(s). ${
        suggestTicket ? "Ticket suggested and awaiting admin approval." : "No ticket suggested."
      }`,
    });
  }

  return { complaintId, steps, source, ticketSuggested: suggestTicket };
}
